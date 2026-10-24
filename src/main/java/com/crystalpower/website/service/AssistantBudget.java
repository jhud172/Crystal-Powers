package com.crystalpower.website.service;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import java.time.YearMonth;
import java.time.ZoneOffset;
@Service
public class AssistantBudget {
 private final JdbcTemplate jdbc;
 public AssistantBudget(JdbcTemplate jdbc){this.jdbc=jdbc;}
 /** Conservative reservations are never refunded, including ambiguous provider outcomes. */
 public boolean reserve(long limit,long cost){
  if(limit<=0||cost<=0||cost>limit)return false;
  String month=YearMonth.now(ZoneOffset.UTC).toString();
  try{jdbc.update("INSERT INTO assistant_budget(month_key,reserved_pence) VALUES (?,0)",month);}catch(DuplicateKeyException ignored){}
  return jdbc.update("UPDATE assistant_budget SET reserved_pence=reserved_pence+? WHERE month_key=? AND reserved_pence<=?",cost,month,limit-cost)==1;
 }
}
