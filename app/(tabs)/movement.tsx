import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/Date/DatePicker';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useMovements } from '@/context/MovementsContext';
import { formatAmount, parseAmount } from '@/utils/current';
import { MovementSchema, MovementFormValues } from '@/features/movements/domain/movementValidator';

import categories from '@/config/categories.json';
import entities from '@/config/entities.json';
import typeOfMovements from '@/config/typeOfMovements.json';

export default function Movement() {
  const { addMovement } = useMovements();
  const [displayAmount, setDisplayAmount] = useState('');

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MovementFormValues>({
    resolver: zodResolver(MovementSchema),
    defaultValues: {
      description: '',
      amount: 0,
      date: new Date(),
      typeOfMovement: undefined,
      category: '',
      entity: '',
    },
  });

  const onSubmit = (data: MovementFormValues) => {
    addMovement(data);
    reset({ description: '', amount: 0, date: new Date(), typeOfMovement: undefined, category: '', entity: '' });
    setDisplayAmount('');
    router.navigate('/');
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.subtitle}>Income or Expense Entry</Text>

      <View style={styles.row}>
        <Controller
          control={control}
          name="typeOfMovement"
          render={({ field: { value, onChange } }) => (
            <Select
              value={value || ''}
              options={typeOfMovements}
              placeholder="Select the type*"
              label="Select the type"
              onChange={onChange}
            />
          )}
        />
        <View style={{ flex: 1.5 }}>
          <Controller
            control={control}
            name="amount"
            render={({ field: { onChange } }) => (
              <Input
                value={displayAmount}
                onChange={(text) => {
                  const parsed = parseAmount(text);
                  setDisplayAmount(formatAmount(parsed));
                  onChange(parsed);
                }}
                placeholder="Amount*"
                keyboardType="numeric"
              />
            )}
          />
        </View>
      </View>
      {errors.typeOfMovement && <Text style={styles.errorText}>{errors.typeOfMovement.message}</Text>}
      {errors.amount && <Text style={styles.errorText}>{errors.amount.message}</Text>}

      <View style={styles.row}>
        <Controller
          control={control}
          name="category"
          render={({ field: { value, onChange } }) => (
            <Select
              value={value}
              options={categories}
              placeholder="Select a category*"
              label="Select a category"
              onChange={onChange}
            />
          )}
        />
      </View>
      {errors.category && <Text style={styles.errorText}>{errors.category.message}</Text>}

      <Controller
        control={control}
        name="description"
        render={({ field: { value, onChange } }) => (
          <Input
            value={value}
            placeholder="Description*"
            onChange={onChange}
          />
        )}
      />
      {errors.description && <Text style={styles.errorText}>{errors.description.message}</Text>}

      <View style={styles.row}>
        <Controller
          control={control}
          name="entity"
          render={({ field: { value, onChange } }) => (
            <Select
              value={value || ''}
              options={entities.map((entity) => ({
                name: entity.name,
                value: entity.id.toString(),
              }))}
              placeholder="Select an entity"
              label="Select an entity"
              onChange={onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="date"
          render={({ field: { value, onChange } }) => (
            <DatePicker date={value} onChange={onChange} />
          )}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button text="Save" onPress={handleSubmit(onSubmit)} variant="dark" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginHorizontal: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 16,
    color: '#666',
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 5,
  },
  buttonContainer: {
    marginRight: 'auto',
    marginTop: 20,
  },
  errorText: {
    color: '#c40505',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
});
