/** The kinds of record sent to the admin service — the job names of the admin-sync queue. */
export enum AdminSyncJob {
  Order = 'order',
  StockLevel = 'stock-level',
}
