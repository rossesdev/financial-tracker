export interface IMovement {
  id: string;
  description: string;
  amount: number;
  typeOfMovement: string;
  category: string;
  date: Date;
  entity?: string;
  createdAt: string;
  updatedAt: string;
}

export type TKeyPeriodFilter = "today" | "week" | "month";
