export const INITIAL_TIME_MS=30000;
export const CORRECT_REWARD_MS=3000;
export const WRONG_PENALTY_MS=2000;
export function timeView(remaining){
  const ms=Math.max(0,remaining);
  return {fraction:Math.min(1,ms/INITIAL_TIME_MS),phase:ms<=0?'expired':ms<=10000?'red':ms<=20000?'yellow':'green'};
}
