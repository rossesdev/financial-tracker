import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface Props {
  percentage: number; // 0..1
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
}

export function GoalProgressRing({
  percentage,
  size = 80,
  strokeWidth = 8,
  color = '#1565c0',
  label,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(1, Math.max(0, percentage));
  const strokeDashoffset = circumference * (1 - clampedPct);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#f0f0f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.labelContainer]}>
        <Text style={[styles.pct, { color }]}>{Math.round(clampedPct * 100)}%</Text>
        {label && <Text style={styles.label} numberOfLines={1}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: {
    fontSize: 16,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    maxWidth: 60,
    textAlign: 'center',
  },
});
