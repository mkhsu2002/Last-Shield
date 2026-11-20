export const MILLION_SCORE = 1_000_000;
export type HeroEntry = {
  username:string; callsign?:string; score:number; bestCombo:number; day:number; rules:string; demo:boolean; rank?:number;
};
export type CitizenCertificate = {
  id:string; username:string; callsign?:string; score:number; bestCombo:number; day:number; rules:string; demo:boolean; issuedAt:number;
};
export type DailyChampion = {
  day:number; score:number; tieCount:number; finalized:boolean; winners:HeroEntry[]; anonymousCount:number|null; moreTies:boolean; winnersCursor:string|null;
};
export type HeroHall = {
  season:string; topScores:HeroEntry[]; topCombos:HeroEntry[]; million:CitizenCertificate[]; champions:DailyChampion[];
  historyCursor:number|null; me:{enrolled:boolean; demo:boolean; callsign?:string; certificate:CitizenCertificate|null};
};
