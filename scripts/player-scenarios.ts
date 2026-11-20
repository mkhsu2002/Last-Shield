import { simulateDefense, type Strategy } from './balance-sim.ts';
import { RULES_VERSION } from '../src/shared/game-logic.ts';

// Five control policies, not five people. Repeated dates test determinism and
// changing storm profiles; they cannot establish comprehension or retention.
const scenarios: {id:string;focus:string;strategy:Strategy}[] = [
  {id:'first-time',focus:'Gold cue with 120ms reaction and 160ms release delay',strategy:'human'},
  {id:'score-chaser',focus:'Retry a mistimed press at the next gold window',strategy:'retry'},
  {id:'recovery',focus:'Delayed input and emergency Overdrive',strategy:'human-blast'},
  {id:'eager-overdrive',focus:'Spend charge as soon as available',strategy:'early'},
  {id:'expert-banking',focus:'Bank charge until an incoming impact is close',strategy:'bank'},
];
const dates=[20261119,20261120,20261121];
const results=scenarios.map(scenario=>({...scenario,runs:dates.map(day=>{
  const run=simulateDefense(day,scenario.strategy);
  const repeat=simulateDefense(day,scenario.strategy);
  if(JSON.stringify(run)!==JSON.stringify(repeat))throw new Error('non-deterministic-simulation');
  return {...run,deterministicRepeat:true};
})}));
console.log(JSON.stringify({rules:RULES_VERSION,kind:'five-simulated-control-policies',humanParticipants:0,
  interpretation:'Local gameplay-model simulation only. Not native UI play, first-time comprehension, sharing usability or human cross-day retention evidence.',
  dates,results},null,2));
