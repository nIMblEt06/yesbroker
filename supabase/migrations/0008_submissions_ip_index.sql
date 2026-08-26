create index if not exists submissions_ip_created_idx
  on submissions (ip_hash, created_at);
