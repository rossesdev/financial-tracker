import { useCallback, useState } from "react";
import { View } from "react-native";
import { DatePickerModal } from "react-native-paper-dates";
import { CalendarDate } from "react-native-paper-dates/lib/typescript/Date/Calendar";
import { Button } from "../Button";

type TRangePickerProps = {
  startDate?: Date;
  endDate?: Date;
  onChange: (range: { startDate: Date; endDate: Date }) => void;
};

export const RangePicker = ({
  startDate,
  endDate,
  onChange,
}: TRangePickerProps) => {
  const [open, setOpen] = useState(false);

  const onDismiss = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const onConfirm = useCallback(
    ({
      startDate,
      endDate,
    }: {
      startDate: CalendarDate;
      endDate: CalendarDate;
    }) => {
      setOpen(false);
      onChange({ startDate, endDate } as { startDate: Date; endDate: Date });
    },
    [setOpen, onChange]
  );

  const getTextButton = () => {
    return startDate && endDate
      ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
      : "Select Date Range";
  };

  return (
    <View
      style={{
        alignItems: "flex-start",
      }}
    >
      <Button
        text={getTextButton()}
        variant="dark"
        onPress={() => setOpen(true)}
      />

      <DatePickerModal
        disableStatusBarPadding
        locale="en"
        mode="range"
        presentationStyle="pageSheet"
        visible={open}
        onDismiss={onDismiss}
        startDate={startDate}
        endDate={endDate}
        onConfirm={(e) => onConfirm(e)}
      />
    </View>
  );
};

export default RangePicker;
