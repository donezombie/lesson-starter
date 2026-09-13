export interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  checkIn: string;
  checkOut: string | null;
}
