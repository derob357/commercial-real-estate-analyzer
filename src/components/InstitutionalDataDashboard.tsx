import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Building, 
  FileText, 
  TrendingUp, 
  Database, 
  Search, 
  Download, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  MapPin,
  DollarSign,
  Eye,
  Filter
} from 'lucide-react';

interface InstitutionalProperty {
  id: string;
  source: string;
  address: string;
  city: string;
  state: string;
  property_type: string;
  listing_price?: number;
  cap_rate?: number;
  units?: number;
  sq_ft?: number;
  data_confidence?: number;
}

interface ResearchReport {
  id: string;
  source: string;
  title: string;
  report_type: string;
  market_area?: string;
  publication_date: string;
  extraction_confidence?: number;
  source_url?: string;
}

interface Transaction {
  id: string;
  source: string;
  property_address: string;
  city: string;
  state: string;
  sale_price: number;
  sale_date: string;
  cap_rate?: number;
  property_type: string;
}

interface CapRateData {
  propertyType: string;
  avgCapRate: number;
  dataPoints: number;
  sources: string[];
}

interface ScrapeJob {
  id: string;
  source: string;
  job_type: string;
  status: string;
  created_at: string;
  results_count: number;
  data_quality_score?: number;
}

export function InstitutionalDataDashboard() {
  const [activeTab, setActiveTab] = useState('properties');
  const [properties, setProperties] = useState<InstitutionalProperty[]>([]);
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [capRates, setCapRates] = useState<CapRateData[]>([]);
  const [scrapeJobs, setScrapeJobs] = useState<ScrapeJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and filter states
  const [searchFilters, setSearchFilters] = useState({
    zipCode: '',
    propertyType: '',
    source: '',
    minPrice: '',
    maxPrice: '',
    minCapRate: '',
    maxCapRate: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProperties(),
        fetchReports(),
        fetchTransactions(),
        fetchCapRates(),
        fetchScrapeJobs()
      ]);
    } catch (error) {
      setError('Failed to load institutional data');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/institutional/properties?${params}`);
      if (!response.ok) throw new Error('Failed to fetch properties');
      
      const data = await response.json();
      setProperties(data.properties || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/institutional/market-reports');
      if (!response.ok) throw new Error('Failed to fetch reports');
      
      const data = await response.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/institutional/transactions');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchCapRates = async () => {
    try {
      const response = await fetch('/api/institutional/cap-rates');
      if (!response.ok) throw new Error('Failed to fetch cap rates');
      
      const data = await response.json();
      setCapRates(data.capRates?.byPropertyType || []);
    } catch (error) {
      console.error('Error fetching cap rates:', error);
    }
  };

  const fetchScrapeJobs = async () => {
    try {
      const response = await fetch('/api/institutional/scrape');
      if (!response.ok) throw new Error('Failed to fetch scrape jobs');
      
      const data = await response.json();
      setScrapeJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching scrape jobs:', error);
    }
  };

  const handleSearch = () => {
    fetchProperties();
  };

  const triggerScraping = async (sources: string[], jobTypes: string[]) => {
    try {
      setLoading(true);
      const response = await fetch('/api/institutional/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sources,
          jobTypes,
          priority: 1
        }),
      });

      if (!response.ok) throw new Error('Failed to trigger scraping');
      
      await fetchScrapeJobs();
      setError(null);
    } catch (error) {
      setError('Failed to trigger scraping');
      console.error('Error triggering scraping:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getSourceBadgeColor = (source: string): string => {
    const colors = {
      cbre: 'bg-blue-100 text-blue-800',
      colliers: 'bg-green-100 text-green-800',
      jll: 'bg-purple-100 text-purple-800',
      cushman_wakefield: 'bg-orange-100 text-orange-800'
    };
    return colors[source as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (loading && properties.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading institutional data...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Institutional Data Dashboard</h2>
          <p className="text-muted-foreground">
            Access data from CBRE, Colliers, JLL, and Cushman & Wakefield
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => triggerScraping(['cbre', 'colliers', 'jll', 'cushman_wakefield'], ['properties'])}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Update Properties
          </Button>
          <Button
            variant="outline"
            onClick={() => triggerScraping(['cbre', 'colliers', 'jll', 'cushman_wakefield'], ['research'])}
            disabled={loading}
          >
            <FileText className="h-4 w-4 mr-2" />
            Update Research
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="properties" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Properties
          </TabsTrigger>
          <TabsTrigger value="research" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Research
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="cap-rates" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Cap Rates
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Scraping Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="space-y-4">
          {/* Search and Filter Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Search & Filter Properties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <Input
                  placeholder="Zip Code"
                  value={searchFilters.zipCode}
                  onChange={(e) => setSearchFilters(prev => ({ ...prev, zipCode: e.target.value }))}
                />
                <Select
                  value={searchFilters.propertyType}
                  onValueChange={(value) => setSearchFilters(prev => ({ ...prev, propertyType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Property Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    <SelectItem value="multifamily">Multifamily</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="hospitality">Hospitality</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={searchFilters.source}
                  onValueChange={(value) => setSearchFilters(prev => ({ ...prev, source: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sources</SelectItem>
                    <SelectItem value="cbre">CBRE</SelectItem>
                    <SelectItem value="colliers">Colliers</SelectItem>
                    <SelectItem value="jll">JLL</SelectItem>
                    <SelectItem value="cushman_wakefield">Cushman & Wakefield</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleSearch} className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Properties Table */}
          <Card>
            <CardHeader>
              <CardTitle>Institutional Properties ({properties.length})</CardTitle>
              <CardDescription>
                Properties from major commercial real estate firms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Cap Rate</TableHead>
                      <TableHead>Units/SF</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{property.address}</div>
                            <div className="text-sm text-muted-foreground">
                              {property.city}, {property.state}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSourceBadgeColor(property.source)}>
                            {property.source.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{property.property_type}</TableCell>
                        <TableCell>
                          {property.listing_price ? formatCurrency(property.listing_price) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {property.cap_rate ? formatPercentage(property.cap_rate) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {property.units ? `${property.units} units` : property.sq_ft ? `${property.sq_ft?.toLocaleString()} SF` : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {property.data_confidence && (
                            <div className="flex items-center gap-2">
                              <Progress value={property.data_confidence * 100} className="w-16" />
                              <span className="text-sm">{Math.round(property.data_confidence * 100)}%</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="research" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Research Reports ({reports.length})</CardTitle>
              <CardDescription>
                Latest research and insights from institutional sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {reports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-medium">{report.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge className={getSourceBadgeColor(report.source)}>
                            {report.source.toUpperCase()}
                          </Badge>
                          <span>•</span>
                          <span className="capitalize">{report.report_type?.replace('_', ' ')}</span>
                          {report.market_area && (
                            <>
                              <span>•</span>
                              <span>{report.market_area}</span>
                            </>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Published: {new Date(report.publication_date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.extraction_confidence && (
                          <div className="flex items-center gap-1 text-sm">
                            <Progress value={report.extraction_confidence} className="w-16" />
                            <span>{report.extraction_confidence}%</span>
                          </div>
                        )}
                        {report.source_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a href={report.source_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions ({transactions.length})</CardTitle>
              <CardDescription>
                Commercial real estate transactions from institutional sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Sale Price</TableHead>
                      <TableHead>Cap Rate</TableHead>
                      <TableHead>Sale Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{transaction.property_address}</div>
                            <div className="text-sm text-muted-foreground">
                              {transaction.city}, {transaction.state}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getSourceBadgeColor(transaction.source)}>
                            {transaction.source.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{transaction.property_type}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(transaction.sale_price)}
                        </TableCell>
                        <TableCell>
                          {transaction.cap_rate ? formatPercentage(transaction.cap_rate) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {new Date(transaction.sale_date).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cap-rates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {capRates.map((capRate) => (
              <Card key={capRate.propertyType}>
                <CardHeader>
                  <CardTitle className="capitalize">{capRate.propertyType}</CardTitle>
                  <CardDescription>
                    {capRate.dataPoints} data points from {capRate.sources.length} sources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-3xl font-bold">
                      {formatPercentage(capRate.avgCapRate / 100)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Average Cap Rate
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {capRate.sources.map((source) => (
                        <Badge key={source} variant="outline" className={getSourceBadgeColor(source)}>
                          {source.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scraping Jobs ({scrapeJobs.length})</CardTitle>
              <CardDescription>
                Monitor and manage institutional data scraping jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead>Job Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Quality</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scrapeJobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Badge className={getSourceBadgeColor(job.source)}>
                            {job.source.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">
                          {job.job_type.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(job.status)}
                            <span className="capitalize">{job.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(job.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{job.results_count}</TableCell>
                        <TableCell>
                          {job.data_quality_score && (
                            <div className="flex items-center gap-2">
                              <Progress value={job.data_quality_score} className="w-16" />
                              <span className="text-sm">{job.data_quality_score}%</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}