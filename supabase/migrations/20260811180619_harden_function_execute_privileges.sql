begin;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_approved_user(uuid) from public, anon, authenticated;
revoke all on function public.is_admin(uuid) from public, anon, authenticated;
revoke all on function public.complete_broker_profile(text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.review_broker(uuid, text) from public, anon, authenticated;

grant execute on function public.is_approved_user(uuid) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.complete_broker_profile(text, text, text, text, text) to authenticated;
grant execute on function public.review_broker(uuid, text) to authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

commit;
