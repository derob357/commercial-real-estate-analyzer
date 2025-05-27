import { PrismaClient, type Property } from '@prisma/client';
import { logger } from '../index';

interface ComparablesOptions {
  maxDistance?: number; // miles
  maxResults?: number;
  minSimilarityScore?: number;
  propertyTypes?: string[];
  maxAgeDifference?: number; // years
  unitRangeTolerance?: number; // percentage
  sqftRangeTolerance?: number; // percentage
}

interface ComparableProperty {
  property: Property;
  distance: number; // miles
  similarityScore: number; // 0-1
  comparisonFactors: {
    unitSimilarity: number;
    sizeSimilarity: number;
    ageSimilarity: number;
    locationSimilarity: number;
    typeSimilarity: number;
  };
  recentSale?: {
    salePrice: number;
    saleDate: Date;
    pricePerUnit?: number;
    pricePerSqft?: number;
    capRate?: number;
  };
}

export class ComparablesService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Find comparable properties for a given property
   */
  async findComparables(propertyId: string, options: ComparablesOptions = {}): Promise<ComparableProperty[]> {
    try {
      const {
        maxDistance = 5,
        maxResults = 20,
        minSimilarityScore = 0.5,
        propertyTypes,
        maxAgeDifference = 20,
        unitRangeTolerance = 0.5,
        sqftRangeTolerance = 0.5
      } = options;

      // Get the reference property
      const referenceProperty = await this.prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          comparable_sales: {
            orderBy: { sale_date: 'desc' },
            take: 1
          }
        }
      });

      if (!referenceProperty) {
        throw new Error('Reference property not found');
      }

      if (!referenceProperty.latitude || !referenceProperty.longitude) {
        throw new Error('Reference property must have coordinates for comparable search');
      }

      // Calculate search boundaries (approximate)
      const latRange = maxDistance / 69; // ~69 miles per degree latitude
      const lonRange = maxDistance / (69 * Math.cos(referenceProperty.latitude * Math.PI / 180));

      // Build search criteria
      const whereClause: any = {
        id: { not: propertyId },
        latitude: {
          gte: referenceProperty.latitude - latRange,
          lte: referenceProperty.latitude + latRange
        },
        longitude: {
          gte: referenceProperty.longitude - lonRange,
          lte: referenceProperty.longitude + lonRange
        }
      };

      // Filter by property type
      if (propertyTypes && propertyTypes.length > 0) {
        whereClause.property_type = { in: propertyTypes };
      } else if (referenceProperty.property_type) {
        whereClause.property_type = referenceProperty.property_type;
      }

      // Filter by units (if available)
      if (referenceProperty.units && unitRangeTolerance > 0) {
        const unitRange = referenceProperty.units * unitRangeTolerance;
        whereClause.units = {
          gte: Math.max(1, Math.floor(referenceProperty.units - unitRange)),
          lte: Math.ceil(referenceProperty.units + unitRange)
        };
      }

      // Filter by square footage (if available)
      if (referenceProperty.sq_ft && sqftRangeTolerance > 0) {
        const sqftRange = referenceProperty.sq_ft * sqftRangeTolerance;
        whereClause.sq_ft = {
          gte: Math.floor(referenceProperty.sq_ft - sqftRange),
          lte: Math.ceil(referenceProperty.sq_ft + sqftRange)
        };
      }

      // Filter by age (if available)
      if (referenceProperty.year_built && maxAgeDifference > 0) {
        whereClause.year_built = {
          gte: referenceProperty.year_built - maxAgeDifference,
          lte: referenceProperty.year_built + maxAgeDifference
        };
      }

      // Get potential comparable properties
      const candidateProperties = await this.prisma.property.findMany({
        where: whereClause,
        include: {
          comparable_sales: {
            orderBy: { sale_date: 'desc' },
            take: 1
          },
          underwriting_analysis: {
            orderBy: { analysis_date: 'desc' },
            take: 1
          }
        },
        take: maxResults * 3 // Get more than needed for filtering
      });

      // Calculate similarity scores and distances
      const comparableProperties: ComparableProperty[] = [];

      for (const candidate of candidateProperties) {
        if (!candidate.latitude || !candidate.longitude) continue;

        // Calculate distance
        const distance = this.calculateDistance(
          referenceProperty.latitude,
          referenceProperty.longitude,
          candidate.latitude,
          candidate.longitude
        );

        if (distance > maxDistance) continue;

        // Calculate similarity score
        const comparisonFactors = this.calculateComparisonFactors(referenceProperty, candidate);
        const similarityScore = this.calculateOverallSimilarity(comparisonFactors);

        if (similarityScore < minSimilarityScore) continue;

        // Extract recent sale data if available
        let recentSale;
        if (candidate.comparable_sales.length > 0) {
          const sale = candidate.comparable_sales[0];
          recentSale = {
            salePrice: sale.sale_price,
            saleDate: sale.sale_date,
            pricePerUnit: sale.price_per_unit || undefined,
            pricePerSqft: sale.price_per_sqft || undefined,
            capRate: sale.cap_rate || undefined
          };
        }

        comparableProperties.push({
          property: candidate,
          distance,
          similarityScore,
          comparisonFactors,
          recentSale
        });
      }

      // Sort by similarity score (descending) and then by distance (ascending)
      comparableProperties.sort((a, b) => {
        if (Math.abs(a.similarityScore - b.similarityScore) < 0.01) {
          return a.distance - b.distance;
        }
        return b.similarityScore - a.similarityScore;
      });

      return comparableProperties.slice(0, maxResults);

    } catch (error) {
      logger.error('Comparables search failed:', error);
      throw new Error('Failed to find comparable properties');
    }
  }

  /**
   * Get market statistics from comparable properties
   */
  async getComparableMarketStats(propertyId: string, options: ComparablesOptions = {}): Promise<any> {
    try {
      const comparables = await this.findComparables(propertyId, options);

      if (comparables.length === 0) {
        return null;
      }

      // Extract metrics from comparables
      const prices = comparables
        .filter(c => c.recentSale?.salePrice)
        .map(c => c.recentSale!.salePrice);

      const pricePerUnit = comparables
        .filter(c => c.recentSale?.pricePerUnit)
        .map(c => c.recentSale!.pricePerUnit!);

      const pricePerSqft = comparables
        .filter(c => c.recentSale?.pricePerSqft)
        .map(c => c.recentSale!.pricePerSqft!);

      const capRates = comparables
        .filter(c => c.recentSale?.capRate)
        .map(c => c.recentSale!.capRate!);

      return {
        comparableCount: comparables.length,
        priceStats: this.calculateStats(prices),
        pricePerUnitStats: this.calculateStats(pricePerUnit),
        pricePerSqftStats: this.calculateStats(pricePerSqft),
        capRateStats: this.calculateStats(capRates),
        averageSimilarityScore: comparables.reduce((sum, c) => sum + c.similarityScore, 0) / comparables.length,
        averageDistance: comparables.reduce((sum, c) => sum + c.distance, 0) / comparables.length
      };

    } catch (error) {
      logger.error('Comparable market stats calculation failed:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate comparison factors between reference and candidate property
   */
  private calculateComparisonFactors(reference: Property, candidate: Property) {
    const factors = {
      unitSimilarity: 0,
      sizeSimilarity: 0,
      ageSimilarity: 0,
      locationSimilarity: 1, // Already filtered by location
      typeSimilarity: 0
    };

    // Unit similarity
    if (reference.units && candidate.units) {
      const unitDiff = Math.abs(reference.units - candidate.units);
      const maxUnits = Math.max(reference.units, candidate.units);
      factors.unitSimilarity = 1 - (unitDiff / maxUnits);
    } else if (!reference.units && !candidate.units) {
      factors.unitSimilarity = 1;
    }

    // Size similarity
    if (reference.sq_ft && candidate.sq_ft) {
      const sizeDiff = Math.abs(reference.sq_ft - candidate.sq_ft);
      const maxSize = Math.max(reference.sq_ft, candidate.sq_ft);
      factors.sizeSimilarity = 1 - (sizeDiff / maxSize);
    } else if (!reference.sq_ft && !candidate.sq_ft) {
      factors.sizeSimilarity = 1;
    }

    // Age similarity
    if (reference.year_built && candidate.year_built) {
      const ageDiff = Math.abs(reference.year_built - candidate.year_built);
      factors.ageSimilarity = Math.max(0, 1 - (ageDiff / 50)); // 50-year max difference
    } else if (!reference.year_built && !candidate.year_built) {
      factors.ageSimilarity = 1;
    }

    // Property type similarity
    if (reference.property_type && candidate.property_type) {
      factors.typeSimilarity = reference.property_type === candidate.property_type ? 1 : 0.5;
    } else if (!reference.property_type && !candidate.property_type) {
      factors.typeSimilarity = 1;
    }

    return factors;
  }

  /**
   * Calculate overall similarity score from individual factors
   */
  private calculateOverallSimilarity(factors: any): number {
    const weights = {
      unitSimilarity: 0.3,
      sizeSimilarity: 0.25,
      ageSimilarity: 0.15,
      locationSimilarity: 0.2,
      typeSimilarity: 0.1
    };

    return Object.entries(weights).reduce((score, [factor, weight]) => {
      return score + (factors[factor] * weight);
    }, 0);
  }

  /**
   * Calculate statistical measures for an array of numbers
   */
  private calculateStats(values: number[]) {
    if (values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / values.length;

    // Calculate median
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];

    // Calculate standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      count: values.length,
      mean: Math.round(mean * 100) / 100,
      median: Math.round(median * 100) / 100,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      standardDeviation: Math.round(standardDeviation * 100) / 100,
      range: sorted[sorted.length - 1] - sorted[0]
    };
  }
}