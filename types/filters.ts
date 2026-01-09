export interface FilterState {
  search: string;
  categories: string[];
  entities: string[];
  typeOfMovements: string[];
  dateRange?: { startDate: Date; endDate: Date };
}
