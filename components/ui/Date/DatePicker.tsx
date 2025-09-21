import { useCallback, useState } from "react";
import { View } from "react-native";
import { DatePickerModal } from "react-native-paper-dates";
import { CalendarDate } from "react-native-paper-dates/lib/typescript/Date/Calendar";
import { Button } from "../Button";

type TDatePickerProps = {
  date?: Date;
  onChange: (date: Date) => void;
};

export const DatePicker = ({ date, onChange }: TDatePickerProps) => {
  const [open, setOpen] = useState(false);

  const onDismiss = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const onConfirmSingle = useCallback(
    ({ date }: { date: CalendarDate }) => {
      setOpen(false);
      onChange(date as Date);
    },
    [setOpen, onChange]
  );

  const getTextButton = () => {
    return date ? `Selected date: ${date.toLocaleDateString()}` : "Select Date";
  };

  return (
    <View
      style={{
        alignItems: "flex-start",
        marginLeft: 11,
      }}
    >
      <Button
        text={getTextButton()}
        variant="light"
        onPress={() => setOpen(true)}
      />

      <DatePickerModal
        locale="en"
        mode="single"
        visible={open}
        onDismiss={onDismiss}
        date={date}
        onConfirm={(e) => onConfirmSingle(e)}
      />
    </View>
  );
};

export default DatePicker;
