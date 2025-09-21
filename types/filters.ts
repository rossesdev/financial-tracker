export interface FilterState {
  search: string;
  categories: string[];
  paymentMethods: string[];
  typeOfMovements: string[];
  dateRange?: { startDate: Date; endDate: Date };
}
