import { IGoal, IGoalContribution, GoalStatus } from '@/features/goals/types';

export interface IGoalRepository {
  getAll(): Promise<IGoal[]>;
  getByStatus(status: GoalStatus): Promise<IGoal[]>;
  save(goal: IGoal): Promise<void>;
  update(goal: IGoal): Promise<void>;
  delete(id: string): Promise<void>;
  addContribution(contribution: IGoalContribution): Promise<void>;
  updateContribution(contribution: IGoalContribution): Promise<void>;
  deleteContribution(id: string): Promise<void>;
  getContributionByMovementId(movementId: string): Promise<IGoalContribution | null>;
}
