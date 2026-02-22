let currentDate: string = '';

export function setNewItemDate(date: string): void {
  currentDate = date;
}

export function getNewItemDate(): string {
  return currentDate;
}
