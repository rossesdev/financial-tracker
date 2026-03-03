import { useEntitiesStore } from '@/store/entitiesStore';
import { FC, ReactNode } from 'react';

export const useEntities = () => useEntitiesStore();

// No-op provider
export const EntitiesProvider: FC<{ children: ReactNode }> = ({ children }) => <>{children}</>;
