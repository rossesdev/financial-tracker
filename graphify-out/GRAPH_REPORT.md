# Graph Report - .  (2026-06-12)

## Corpus Check
- Corpus is ~18,420 words - fits in a single context window. You may not need a graph.

## Summary
- 268 nodes · 398 edges · 17 communities (15 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_App Config|App Config]]
- [[_COMMUNITY_Package Dependencies|Package Dependencies]]
- [[_COMMUNITY_Date Picker & Tabs|Date Picker & Tabs]]
- [[_COMMUNITY_Movements & Balance UI|Movements & Balance UI]]
- [[_COMMUNITY_Navigation & Layout|Navigation & Layout]]
- [[_COMMUNITY_App Layout & Context|App Layout & Context]]
- [[_COMMUNITY_Multi-Select Modal|Multi-Select Modal]]
- [[_COMMUNITY_Dev Dependencies|Dev Dependencies]]
- [[_COMMUNITY_All Movements Screen|All Movements Screen]]
- [[_COMMUNITY_Movement Filters|Movement Filters]]
- [[_COMMUNITY_Scripts|Scripts]]
- [[_COMMUNITY_TypeScript Config|TypeScript Config]]
- [[_COMMUNITY_Finance Charts|Finance Charts]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]

## God Nodes (most connected - your core abstractions)
1. `expo` - 17 edges
2. `useMovements()` - 13 edges
3. `IMovement` - 11 edges
4. `IconSymbol()` - 8 edges
5. `Button()` - 7 edges
6. `scripts` - 7 edges
7. `useThemeColor()` - 6 edges
8. `Option` - 6 edges
9. `Chip()` - 5 edges
10. `useEntities()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `TabLayout()` --calls--> `useColorScheme()`  [INFERRED]
  app/(tabs)/_layout.tsx → hooks/useColorScheme.web.ts
- `HomeScreen()` --calls--> `useMovements()`  [EXTRACTED]
  app/(tabs)/index.tsx → context/MovementsContext.tsx
- `Movement()` --calls--> `useMovements()`  [EXTRACTED]
  app/(tabs)/movement.tsx → context/MovementsContext.tsx
- `Transaction()` --calls--> `useMovements()`  [EXTRACTED]
  app/(tabs)/transaction.tsx → context/MovementsContext.tsx
- `AllMovementsScreen()` --calls--> `useMovements()`  [EXTRACTED]
  app/allMovements.tsx → context/MovementsContext.tsx

## Import Cycles
- None detected.

## Communities (17 total, 2 thin omitted)

### Community 0 - "App Config"
Cohesion: 0.06
Nodes (35): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, package, projectId, typedRoutes, expo (+27 more)

### Community 1 - "Package Dependencies"
Cohesion: 0.06
Nodes (33): dependencies, date-fns, expo, expo-blur, expo-constants, expo-font, expo-haptics, expo-image (+25 more)

### Community 2 - "Date Picker & Tabs"
Cohesion: 0.11
Nodes (19): DatePicker(), TDatePickerProps, styles, imageMap, styles, { width: screenWidth }, Button(), ButtonProps (+11 more)

### Community 3 - "Movements & Balance UI"
Cohesion: 0.12
Nodes (17): AllMovementsScreen(), BalanceDisplay(), styles, styles, useMovements(), FilterKey, IMovementListItemProps, MovementsList() (+9 more)

### Community 4 - "Navigation & Layout"
Cohesion: 0.14
Nodes (13): styles, Collapsible(), styles, HapticTab(), styles, ThemedText(), ThemedTextProps, ThemedView() (+5 more)

### Community 5 - "App Layout & Context"
Cohesion: 0.14
Nodes (15): EntitiesContext, EntitiesContextType, EntitiesProvider(), useEntities(), IMovementBase, MovementsContext, MovementsContextType, MovementsProvider() (+7 more)

### Community 6 - "Multi-Select Modal"
Cohesion: 0.18
Nodes (13): ModalHeader(), ModalHeaderProps, styles, CHIP_CONFIG, MODAL_CONFIG, MultipleSelect(), MultipleSelectProps, styles (+5 more)

### Community 7 - "Dev Dependencies"
Cohesion: 0.11
Nodes (17): devDependencies, @babel/core, eslint, eslint-config-expo, @types/react, typescript, main, name (+9 more)

### Community 8 - "All Movements Screen"
Cohesion: 0.17
Nodes (11): styles, styles, RangePicker(), TRangePickerProps, MovementListItem(), styles, IconMapping, IconSymbol() (+3 more)

### Community 9 - "Movement Filters"
Cohesion: 0.17
Nodes (11): styles, TMovementsFilterButtonsProps, MovementDetailsContent(), Chip(), styles, TChipProps, CategoryData, EMPTY_CATEGORY_DATA (+3 more)

### Community 10 - "Scripts"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 11 - "TypeScript Config"
Cohesion: 0.29
Nodes (6): compilerOptions, paths, strict, extends, include, @/*

## Knowledge Gaps
- **134 isolated node(s):** `name`, `slug`, `version`, `orientation`, `icon` (+129 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `IconSymbol()` connect `All Movements Screen` to `Date Picker & Tabs`, `Navigation & Layout`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Package Dependencies` to `Dev Dependencies`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `useMovements()` connect `Movements & Balance UI` to `All Movements Screen`, `Date Picker & Tabs`, `App Layout & Context`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `version` to the rest of the system?**
  _134 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Config` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `Package Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `Date Picker & Tabs` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._