-- Per-user Data Desk: last name, DCF sliders, and a private memo.
create table if not exists desk_settings (
  user_id      text primary key,
  ticker       text not null,
  scenario     text not null,
  growth       text not null,
  gross_margin double precision not null,
  wacc         double precision not null,
  tgr          double precision not null,
  tax_rate     double precision not null,
  n_sims       integer not null,
  note         text not null default '',
  updated_at   timestamptz not null default now()
);
