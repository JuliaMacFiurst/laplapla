/* eslint-disable @next/next/no-img-element */
import { useEffect, useReducer, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Lang } from "@/i18n";
import { dictionaries } from "@/i18n";
import { ExpertClubAudio } from "@/lib/shop/quests/sound-case-001/expertClubAudio";
import { EXPERT_CLUB_STORAGE_KEY, INITIAL_EXPERT_CLUB_STATE, getLatestChallengeAnswer, getRound1RevealKind, parseStoredExpertClubState, reduceExpertClub, type ExpertClubChallenge, type ExpertClubMode, type ExpertClubResponder, type ExpertClubState } from "@/lib/shop/quests/sound-case-001/expertClubGame";
import { STAGE_7_DISCUSSION_SECONDS, STAGE_7_EQUIPMENT } from "@/lib/shop/quests/sound-case-001/expertClub";
import { SOUND_CASE_001_STAGE_2_PHRASES } from "@/lib/shop/quests/sound-case-001/vibratingCards";
import { STAGE_6_COORDINATE_PUZZLE } from "@/lib/shop/quests/sound-case-001/scatteredSand";

type Labels = typeof dictionaries.ru.shop.soundCase.stage07;
type HostStyle = CSSProperties & { "--expert-club-background"?: string };

const getChallenge = (step: ExpertClubState["step"]): ExpertClubChallenge | null => step.startsWith("round-1") ? "round1" : step.startsWith("bonus") ? "bonus" : step.startsWith("round-2") ? "round2" : null;

export function ExpertClubHost({ lang, parrotUrl, backgroundUrl, bonusVisualUrl, duneAudioUrl, victoryAudioUrl }: { lang: Lang; parrotUrl: string; backgroundUrl?: string; bonusVisualUrl?: string; duneAudioUrl: string; victoryAudioUrl: string }) {
  const t = dictionaries[lang].shop.soundCase.stage07;
  const [state, dispatch] = useReducer(reduceExpertClub, INITIAL_EXPERT_CLUB_STATE);
  const [mode, setMode] = useState<ExpertClubMode>("cooperative");
  const [groupName, setGroupName] = useState("");
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [restore, setRestore] = useState<ExpertClubState | null>(null);
  const [hint, setHint] = useState(false);
  const [seconds, setSeconds] = useState<number>(STAGE_7_DISCUSSION_SECONDS);
  const [running, setRunning] = useState(false);
  const [dunePlaying, setDunePlaying] = useState(false);
  const audio = useRef<ExpertClubAudio | null>(null);
  const timerChallenge = useRef<ExpertClubChallenge | null>(null);

  const nameA = state.teamAName || t.teamAName;
  const nameB = state.teamBName || t.teamBName;
  const group = state.groupName || t.oneGroup;

  useEffect(() => {
    audio.current = new ExpertClubAudio();
    const stored = parseStoredExpertClubState(window.sessionStorage.getItem(EXPERT_CLUB_STORAGE_KEY));
    if (stored && stored.step !== "setup") setRestore(stored);
    return () => audio.current?.dispose();
  }, []);
  useEffect(() => { if (state.step !== "setup") window.sessionStorage.setItem(EXPERT_CLUB_STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    setHint(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const challenge = getChallenge(state.step);
    if (state.step.endsWith("-question")) {
      if (timerChallenge.current !== challenge) { timerChallenge.current = challenge; setSeconds(STAGE_7_DISCUSSION_SECONDS); }
    } else {
      setRunning(false);
      audio.current?.stopTicking();
    }
    if (state.step !== "round-2-question") audio.current?.stopDuneClue();
    if (state.step === "celebration") audio.current?.playVictoryFanfare(victoryAudioUrl);
  }, [state.step, victoryAudioUrl]);
  useEffect(() => {
    if (!running) { audio.current?.stopTicking(); return; }
    audio.current?.startTicking();
    const timer = window.setInterval(() => setSeconds(current => {
      if (current <= 1) {
        window.clearInterval(timer); setRunning(false); audio.current?.stopTicking(); audio.current?.play("timer-end"); return 0;
      }
      return current - 1;
    }), 1000);
    return () => { window.clearInterval(timer); audio.current?.stopTicking(); };
  }, [running]);

  const hostStyle: HostStyle = backgroundUrl ? { "--expert-club-background": `url("${backgroundUrl}")` } : {};
  const suggest = (target: "group" | "a" | "b") => {
    const current = target === "group" ? groupName : target === "a" ? teamAName : teamBName;
    const other = target === "a" ? teamBName : target === "b" ? teamAName : "";
    const available = t.suggestedNames.filter(name => name !== other);
    const next = available[(Math.max(available.indexOf(current), -1) + 1) % available.length] || t.suggestedNames[0];
    if (target === "group") setGroupName(next); else if (target === "a") setTeamAName(next); else setTeamBName(next);
  };
  const startTimer = () => {
    if (seconds === 0) setSeconds(STAGE_7_DISCUSSION_SECONDS);
    setRunning(true); audio.current?.play("timer-start");
  };
  const pauseTimer = () => { setRunning(false); audio.current?.stopTicking(); };
  const beginAnswer = (responders: ExpertClubResponder[]) => { pauseTimer(); dispatch({ type: "begin-answer", responders }); };
  const advance = () => dispatch({ type: "advance" });

  if (restore) return <main className={`expert-club${backgroundUrl ? " has-background" : ""}`} style={hostStyle} lang={lang} dir={lang === "he" ? "rtl" : "ltr"}><div className="expert-club__shell"><ExpertClubRecoveryPanel labels={t} onContinue={() => { dispatch({ type: "restore", state: restore }); setRestore(null); }} onRestart={() => { window.sessionStorage.removeItem(EXPERT_CLUB_STORAGE_KEY); setRestore(null); }}/></div></main>;

  return <main className={`expert-club${backgroundUrl ? " has-background" : ""}`} style={hostStyle} lang={lang} dir={lang === "he" ? "rtl" : "ltr"} data-step={state.step}>
    <div className="expert-club__shell">
      <div className="expert-club__mast"><bdi dir="ltr">PARROT SOUND LAB</bdi><h1>{t.title}</h1></div>
      {state.step !== "setup" && state.step !== "physical-handoff" ? <Scoreboard state={state} nameA={nameA} nameB={nameB} labels={t} /> : null}
      {state.step === "setup" ? <section className="expert-club__card expert-club__setup"><h2>{t.setupTitle}</h2><fieldset><legend>{t.chooseMode}</legend><ModeButton active={mode === "cooperative"} title={t.oneGroup} body={t.oneGroupHelp} onClick={() => setMode("cooperative")} /><ModeButton active={mode === "teams"} title={t.twoTeams} body={t.twoTeamsHelp} onClick={() => setMode("teams")} /></fieldset>{mode === "cooperative" ? <NameInput label={t.groupName} value={groupName} onChange={setGroupName} onSuggest={() => suggest("group")} labels={t} /> : <><NameInput label={t.teamAName} value={teamAName} onChange={setTeamAName} onSuggest={() => suggest("a")} labels={t} /><NameInput label={t.teamBName} value={teamBName} onChange={setTeamBName} onSuggest={() => suggest("b")} labels={t} /></>}<button className="expert-club__primary" onClick={() => dispatch({ type: "configure", mode, groupName, teamAName, teamBName })}>{t.begin}</button></section> : null}
      {state.step === "intro" ? <HostStep kicker="PARROT" title={t.title} parrotUrl={parrotUrl} read={t.introLines} onContinue={advance} continueLabel={t.continue} /> : null}
      {state.step === "round-1-setup" ? <HostStep kicker={t.round1Label} title={t.round1Title} actionLabel={t.hostDo} action={t.round1Setup} cardNames={STAGE_7_EQUIPMENT.map(item => t.equipment[item.id])} onContinue={advance} continueLabel={t.continue} /> : null}
      {state.step === "round-1-question" ? <QuestionStep state={state} challenge="round1" kicker={t.round1Label} title={t.round1Title} read={[...t.round1Read, t.round1Question]} seconds={seconds} running={running} labels={t} nameA={nameA} nameB={nameB} start={startTimer} pause={pauseTimer} reset={() => { pauseTimer(); setSeconds(STAGE_7_DISCUSSION_SECONDS); }} beginAnswer={beginAnswer} selectRoulette={responder=>dispatch({type:"select-roulette",challenge:"round1",responder})}><p className="expert-club__host-note">{t.round1ExpectedJoke}</p></QuestionStep> : null}
      {state.step === "round-1-attempt" ? <AttemptStep state={state} challenge="round1" labels={t} nameA={nameA} nameB={nameB} options={STAGE_7_EQUIPMENT.map(item => ({id:item.id,label:t.equipment[item.id]}))} audio={audio.current} dispatch={dispatch} resume={() => { dispatch({type:"resume-other-team"}); setRunning(true); }} /> : null}
      {state.step === "round-1-reveal" ? <Round1Reveal state={state} labels={t} onContinue={advance} /> : null}
      {state.step === "bonus-setup" ? <HostStep kicker={t.bonusLabel} title={t.bonusQuestion} actionLabel={t.hostDo} action={t.bonusSetup} onContinue={advance} continueLabel={t.continue} /> : null}
      {state.step === "bonus-question" ? <QuestionStep state={state} challenge="bonus" kicker={t.bonusLabel} title={t.bonusQuestion} read={[t.bonusQuestion]} seconds={seconds} running={running} labels={t} nameA={nameA} nameB={nameB} start={startTimer} pause={pauseTimer} reset={() => { pauseTimer(); setSeconds(STAGE_7_DISCUSSION_SECONDS); }} beginAnswer={beginAnswer} selectRoulette={responder=>dispatch({type:"select-roulette",challenge:"bonus",responder})}><aside className="expert-club__hint"><button onClick={() => setHint(value=>!value)}>{hint?t.hideHint:t.showHint}</button>{hint?<p>{t.bonusHint}</p>:null}</aside><HostOnlyAnswerPanel labels={t} lines={t.bonusAnswerReference} warning={t.hostOnlyReadWarning} buttonLabel={t.inspectCorrectAnswer} visualUrl={bonusVisualUrl} visualAlt={t.bonusVisualAlt} visualPlaceholder={t.bonusVisualPlaceholder} visualDisclaimer={t.bonusVisualDisclaimer} visualCaption={t.bonusVisualCaption}/></QuestionStep> : null}
      {state.step === "bonus-attempt" ? <AttemptStep state={state} challenge="bonus" labels={t} nameA={nameA} nameB={nameB} bonusVisualUrl={bonusVisualUrl} audio={audio.current} dispatch={dispatch} resume={() => { dispatch({type:"resume-other-team"}); setRunning(true); }} /> : null}
      {state.step === "bonus-reveal" ? <HostStep kicker={t.bonusLabel} title={t.bonusQuestion} read={t.bonusReveal} onContinue={advance} continueLabel={t.continue} /> : null}
      {state.step === "round-2-setup" ? <HostStep kicker={t.round2Label} title={t.round2Title} actionLabel={t.hostDo} action={t.round2Setup} onContinue={advance} continueLabel={t.continue} /> : null}
      {state.step === "round-2-question" ? <QuestionStep state={state} challenge="round2" kicker={t.round2Label} title={t.round2Title} read={t.round2Read} seconds={seconds} running={running} labels={t} nameA={nameA} nameB={nameB} start={startTimer} pause={pauseTimer} reset={() => { pauseTimer(); setSeconds(STAGE_7_DISCUSSION_SECONDS); }} beginAnswer={beginAnswer} selectRoulette={responder=>dispatch({type:"select-roulette",challenge:"round2",responder})} beforeRead={<DuneSoundControl playing={dunePlaying} labels={t} onPlay={()=>audio.current?.playDuneClue(duneAudioUrl,setDunePlaying)}/>} beforeRule={<Round2Options options={t.round2Options}/>}><HostOnlyAnswerPanel labels={t} lines={t.round2CorrectReference} warning={t.hostOnlyWarning}/></QuestionStep> : null}
      {state.step === "round-2-attempt" ? <AttemptStep state={state} challenge="round2" labels={t} nameA={nameA} nameB={nameB} options={t.round2Options.map((label,index)=>({id:String.fromCharCode(65+index),label:`${String.fromCharCode(65+index)}. ${label}`}))} audio={audio.current} dispatch={dispatch} resume={() => { dispatch({type:"resume-other-team"}); setRunning(true); }} /> : null}
      {state.step === "round-2-reveal" ? <ProtectedRevealStep kicker={t.round2Label} title={t.round2Title} lines={t.round2Reveal} labels={t} onContinue={advance} continueLabel={t.showResults}/> : null}
      {state.step === "celebration" ? <Celebration state={state} group={group} nameA={nameA} nameB={nameB} labels={t} onContinue={advance} /> : null}
      {state.step === "physical-handoff" ? <section className="expert-club__card expert-club__handoff"><img className="expert-club__parrot" src={parrotUrl} alt=""/><small>PARROT</small><InvestigationRecap lang={lang} labels={t}/><p className="expert-club__recap-transition">{t.recapTransition}</p><h2>{t.handoffTitle}</h2><div className="expert-club__read">{t.handoffLines.map(line=><p key={line}>{line}</p>)}</div><strong>{t.hostStops}</strong></section> : null}
    </div>
  </main>;
}

export function InvestigationRecap({lang,labels}:{lang:Lang;labels:Labels}) {
  const soundCase = dictionaries[lang].shop.soundCase;
  const numbered = [
    soundCase.unknownSoundScene.clueLines.join(" "),
    SOUND_CASE_001_STAGE_2_PHRASES[lang],
    `${soundCase.humanEqualizer.clueStatement} ${soundCase.humanEqualizer.clueExplanation}`,
    soundCase.stage04.digital.clueLines.join(" "),
  ];
  const discoveries = [
    [labels.recapPuzzleTitle, labels.recapPuzzleBody],
    [labels.recapCoordinatesTitle, `${STAGE_6_COORDINATE_PUZZLE.final.latitude} · ${STAGE_6_COORDINATE_PUZZLE.final.longitude}`],
    [labels.recapLocationTitle, labels.recapLocationBody],
    [labels.recapExperimentsTitle, labels.recapExperimentsBody],
  ] as const;
  return <section className="expert-club__recap" aria-labelledby="expert-club-recap-title">
    <h2 id="expert-club-recap-title">{labels.recapTitle}</h2><p>{labels.recapLead}</p>
    <ol>{numbered.map((conclusion,index)=><li key={conclusion}><span aria-hidden="true">✓</span><div><b><bdi dir="auto">{labels.recapClueLabel.replace("{number}",String(index+1))}</bdi></b><p>{conclusion}</p></div></li>)}</ol>
    <ul>{discoveries.map(([title,body],index)=><li key={title}><span aria-hidden="true">✓</span><div><b>{title}</b><p dir={index===1?"ltr":undefined}>{body}</p></div></li>)}</ul>
  </section>;
}

export function ExpertClubRecoveryPanel({labels,onContinue,onRestart}:{labels:Labels;onContinue:()=>void;onRestart:()=>void}) {
  return <section className="expert-club__card expert-club__restore" role="dialog" aria-labelledby="expert-club-restore-title"><h1 id="expert-club-restore-title">{labels.restoreTitle}</h1><p>{labels.restoreBody}</p><div className="expert-club__restore-actions"><button className="expert-club__primary" onClick={onContinue}>{labels.backToGame}</button><button className="expert-club__secondary" onClick={onRestart}>{labels.restart}</button></div></section>;
}

function NameInput({label,value,onChange,onSuggest,labels}:{label:string;value:string;onChange:(value:string)=>void;onSuggest:()=>void;labels:Labels}) { return <div className="expert-club__name-field"><label>{label}<input value={value} onChange={event=>onChange(event.target.value)} placeholder={labels.customName} dir="auto" /></label><button type="button" onClick={onSuggest}>{labels.suggestName}</button></div>; }
function ModeButton({active,title,body,onClick}:{active:boolean;title:string;body:string;onClick:()=>void}) { return <button type="button" className="expert-club__mode" aria-pressed={active} onClick={onClick}><strong>{title}</strong><span>{body}</span></button>; }
function Scoreboard({state,nameA,nameB,labels}:{state:ExpertClubState;nameA:string;nameB:string;labels:Labels}) { return <aside className="expert-club__score">{state.mode === "teams" ? <><span>{nameA} <bdi dir="ltr">{state.scoreA}</bdi></span><b>{labels.score}</b><span>{nameB} <bdi dir="ltr">{state.scoreB}</bdi></span></> : <><b>{labels.cooperativeProgress}</b><span><bdi dir="ltr">{state.cooperativeSolved}</bdi> {labels.challengesSolved}</span></>}</aside>; }
function HostStep({kicker,title,actionLabel,action,read,cardNames,note,parrotUrl,onContinue,continueLabel}:{kicker:string;title:string;actionLabel?:string;action?:string;read?:readonly string[];cardNames?:readonly string[];note?:string;parrotUrl?:string;onContinue:()=>void;continueLabel:string}) { return <section className="expert-club__card"><small>{kicker}</small>{parrotUrl?<img className="expert-club__parrot" src={parrotUrl} alt=""/>:null}<h2>{title}</h2>{action?<div className="expert-club__instruction"><b>{actionLabel}</b><p>{action}</p></div>:null}{cardNames?<ul className="expert-club__cards-list">{cardNames.map(name=><li key={name}>{name}</li>)}</ul>:null}{read?<div className="expert-club__read">{read.map(line=><p key={line}>{line}</p>)}</div>:null}{note?<aside className="expert-club__editorial">{note}</aside>:null}<button className="expert-club__primary" onClick={onContinue}>{continueLabel}</button></section>; }

export function Round2Options({options}:{options:readonly string[]}) {
  return <section className="expert-club__question-options" aria-label="A–D"><ol>{options.map((option,index)=><li key={option}><b>{String.fromCharCode(65+index)}</b><span>{option}</span></li>)}</ol></section>;
}

export function DuneSoundControl({playing,labels,onPlay}:{playing:boolean;labels:Labels;onPlay:()=>void}) {
  return <div className="expert-club__sound">
    <button type="button" className={playing?"is-playing":undefined} aria-pressed={playing} aria-label={playing?labels.soundPlaying:labels.playSound} onClick={onPlay}>
      <span>{playing?labels.soundPlaying:labels.playSound}</span>
      <span className="expert-club__sound-wave" aria-hidden="true"><i/><i/><i/><i/><i/></span>
    </button>
    <small>{labels.duneAudioProvenance}</small>
  </div>;
}

function QuestionStep({state,challenge,kicker,title,read,seconds,running,labels,nameA,nameB,start,pause,reset,beginAnswer,selectRoulette,beforeRead,beforeRule,children}:{state:ExpertClubState;challenge:ExpertClubChallenge;kicker:string;title:string;read:readonly string[];seconds:number;running:boolean;labels:Labels;nameA:string;nameB:string;start:()=>void;pause:()=>void;reset:()=>void;beginAnswer:(responders:ExpertClubResponder[])=>void;selectRoulette:(responder:"a"|"b")=>void;beforeRead?:ReactNode;beforeRule?:ReactNode;children?:ReactNode}) {
  const minutes=String(Math.floor(seconds/60)).padStart(2,"0"), remainder=String(seconds%60).padStart(2,"0");
  const attempted=state.attempts[challenge];
  const attemptCount=Object.keys(attempted).length;
  const rouletteSelection=state.rouletteSelections[challenge];
  useEffect(()=>{
    if(seconds===0&&state.mode==="teams"&&attemptCount===0&&!rouletteSelection) selectRoulette(Math.random()<.5?"a":"b");
  },[attemptCount,rouletteSelection,seconds,selectRoulette,state.mode]);
  const buzzers=<div className="expert-club__answer-buzzers">{state.mode === "cooperative" ? <button className="expert-club__primary" onClick={()=>beginAnswer(["group"])}>{labels.groupAnswers}</button> : <>{attempted.a===undefined?<button onClick={()=>beginAnswer(["a"])}>{nameA} — {labels.answers}</button>:null}{attempted.b===undefined?<button onClick={()=>beginAnswer(["b"])}>{nameB} — {labels.answers}</button>:null}{attempted.a===undefined&&attempted.b===undefined?<button onClick={()=>beginAnswer(["a","b"])}>{labels.bothAnswer}</button>:null}</>}</div>;
  return <section className="expert-club__card"><small>{kicker}</small><h2>{title}</h2>{beforeRead}<div className="expert-club__read"><b>{labels.hostRead}</b>{read.map(line=><p key={line}>{line}</p>)}</div>{beforeRule}<aside className="expert-club__answer-rule"><strong>{labels.answerAnytimeTitle}</strong>{labels.answerAnytimeLines.map(line=><span key={line}>{line}</span>)}</aside>{seconds===0&&state.mode==="teams"&&attemptCount===0&&rouletteSelection?<TeamRoulette selected={rouletteSelection} nameA={nameA} nameB={nameB} labels={labels} onAnswer={()=>beginAnswer([rouletteSelection])}/>:<><div className={`expert-club__timer${seconds===0?" is-finished":""}`}><span>{labels.timerLabel}</span><bdi dir="ltr">{minutes}:{remainder}</bdi>{seconds>0?<><button className="expert-club__primary" onClick={running?pause:start}>{running?labels.pauseTimer:labels.startTimer}</button><button onClick={reset}>{labels.resetTimer}</button></>:<div className="expert-club__time-up"><strong>{labels.timeExpired}</strong><span>{labels.giveYourVersion}</span></div>}</div>{children}{buzzers}</>}</section>;
}

function AttemptStep({state,challenge,labels,nameA,nameB,options,bonusVisualUrl,audio,dispatch,resume}:{state:ExpertClubState;challenge:ExpertClubChallenge;labels:Labels;nameA:string;nameB:string;options?:readonly {id:string;label:string}[];bonusVisualUrl?:string;audio:ExpertClubAudio|null;dispatch:React.Dispatch<Parameters<typeof reduceExpertClub>[1]>;resume:()=>void}) {
  const responderName=state.activeResponder==="a"?nameA:state.activeResponder==="b"?nameB:labels.oneGroup;
  const requiresAnswer=challenge!=="bonus";
  const completedCount=Object.keys(state.attempts[challenge]).length;
  if (state.awaitingSecondTeam) {
    const previousAnswer=getLatestChallengeAnswer(state,challenge);
    const selectedLabel=options?.find(option=>option.id===previousAnswer)?.label || "";
    const feedback=challenge==="round1"?(previousAnswer==="human-butt"?labels.round1ButtReveal:<>{labels.round1OtherTitle}<br/>{labels.round1OtherLine.replace("{item}",selectedLabel)}</>):labels.notQuite;
    return <section className="expert-club__card expert-club__between-attempts"><h2>{Array.isArray(feedback)?feedback[0]:feedback}</h2>{Array.isArray(feedback)?feedback.slice(1).map(line=><p key={line}>{line}</p>):null}<p>{labels.secondTeamQuestion}</p><div className="expert-club__results"><button className="expert-club__primary" onClick={resume}>{labels.giveRemaining}</button><button onClick={()=>dispatch({type:"skip-other-team"})}>{labels.showAnswer}</button></div></section>;
  }
  const referenceLines=challenge==="bonus"?labels.bonusAnswerReference:challenge==="round2"?labels.round2CorrectReference:null;
  return <section className="expert-club__card expert-club__attempt"><div className="expert-club__responder"><strong>{completedCount===0?labels.firstVersion:labels.secondVersion}</strong><small>{labels.answering}</small><h2>{responderName}</h2></div>{options?<div className="expert-club__answer-options"><b>{labels.theirAnswer}</b>{options.map(option=><button key={option.id} aria-pressed={state.pendingAnswer===option.id} onClick={()=>dispatch({type:"select-answer",answer:option.id})}>{option.label}</button>)}</div>:<p>{labels.hostJudgesIdea}</p>}{referenceLines?<HostOnlyAnswerPanel labels={labels} lines={referenceLines} warning={challenge==="bonus"?labels.hostOnlyReadWarning:labels.hostOnlyWarning} buttonLabel={challenge==="bonus"?labels.inspectCorrectAnswer:undefined} visualUrl={challenge==="bonus"?bonusVisualUrl:undefined} visualAlt={challenge==="bonus"?labels.bonusVisualAlt:undefined} visualPlaceholder={challenge==="bonus"?labels.bonusVisualPlaceholder:undefined} visualDisclaimer={challenge==="bonus"?labels.bonusVisualDisclaimer:undefined} visualCaption={challenge==="bonus"?labels.bonusVisualCaption:undefined}/>:null}{challenge==="bonus"?<div className="expert-club__verdict"><button aria-pressed={state.pendingCorrect===true} onClick={()=>dispatch({type:"select-correctness",correct:true})}>{labels.correct}</button><button aria-pressed={state.pendingCorrect===false} onClick={()=>dispatch({type:"select-correctness",correct:false})}>{labels.wrong}</button></div>:null}<button className="expert-club__primary" disabled={state.pendingCorrect===null||(requiresAnswer&&!state.pendingAnswer)} onClick={()=>{ if (!state.responderQueue.length) { const anyCorrect=state.pendingCorrect||Object.values(state.attempts[challenge]).some(Boolean); audio?.play(anyCorrect?"correct":"failure"); } dispatch({type:"confirm-attempt"}); }}>{labels.confirmResult}</button><small>{labels.editableUntilConfirm}</small></section>;
}

function TeamRoulette({selected,nameA,nameB,labels,onAnswer}:{selected:"a"|"b";nameA:string;nameB:string;labels:Labels;onAnswer:()=>void}) {
  const [settled,setSettled]=useState(false);
  useEffect(()=>{
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){setSettled(true);return;}
    const timer=window.setTimeout(()=>setSettled(true),2200);
    return()=>window.clearTimeout(timer);
  },[]);
  const selectedName=selected==="a"?nameA:nameB;
  return <section className="expert-club__roulette" aria-live="polite"><strong>{labels.rouletteTitle}</strong><div className={`expert-club__roulette-wheel is-${selected}`}><svg viewBox="0 0 200 200" role="img" aria-label={`${nameA} / ${nameB}`}><path d="M100 100L100 0A100 100 0 0 1 100 200Z"/><path d="M100 100L100 200A100 100 0 0 1 100 0Z"/><circle cx="100" cy="100" r="17"/></svg><span className="team-a" dir="auto">{nameA}</span><span className="team-b" dir="auto">{nameB}</span><i aria-hidden="true">▼</i></div>{settled?<><small>{labels.rouletteAnswers}</small><h3 dir="auto">{selectedName}</h3><button className="expert-club__primary" onClick={onAnswer}>{selectedName} — {labels.answers}</button></>:<p>{labels.rouletteSpinning}</p>}</section>;
}

export function Round1Reveal({state,labels,onContinue}:{state:ExpertClubState;labels:Labels;onContinue:()=>void}) {
  const kind=getRound1RevealKind(state);
  const latest=getLatestChallengeAnswer(state,"round1");
  const selected=STAGE_7_EQUIPMENT.find(item=>item.id===latest);
  const selectedLabel=selected?labels.equipment[selected.id]:"";
  const feedback=kind==="correct"?[labels.round1Reveal[0]]:kind==="butt"?labels.round1ButtReveal:kind==="other"?[labels.round1OtherTitle,labels.round1OtherLine.replace("{item}",selectedLabel)]:[];
  return <section className="expert-club__card"><small>{labels.round1Label}</small><h2>{labels.round1Title}</h2>{feedback.length?<div className="expert-club__read">{feedback.map(line=><p key={line}>{line}</p>)}</div>:null}<HostOnlyAnswerPanel labels={labels} lines={[labels.round1FullAnswer,labels.round1Editorial]} warning={labels.hostOnlyWarning}/><button className="expert-club__primary" onClick={onContinue}>{labels.continue}</button></section>;
}

export function HostOnlyAnswerPanel({labels,lines,warning,buttonLabel,visualUrl,visualAlt,visualPlaceholder,visualDisclaimer,visualCaption}:{labels:Labels;lines:readonly string[];warning:string;buttonLabel?:string;visualUrl?:string;visualAlt?:string;visualPlaceholder?:string;visualDisclaimer?:string;visualCaption?:string}) {
  const [revealed,setRevealed]=useState(false);
  const showDevelopmentPlaceholder=!visualUrl&&Boolean(visualPlaceholder)&&process.env.NODE_ENV!=="production";
  return <aside className="expert-club__host-only"><strong>{labels.hostOnly}</strong><span>{warning}</span><button type="button" aria-expanded={revealed} onClick={()=>setRevealed(value=>!value)}>{revealed?labels.hideCorrectAnswer:buttonLabel||labels.showCorrectAnswer}</button>{revealed?<div className="expert-club__host-only-answer">{visualUrl?<figure className="expert-club__bonus-visual"><img src={visualUrl} alt={visualAlt||""}/>{visualDisclaimer?<small>{visualDisclaimer}</small>:null}{visualCaption?<figcaption>{visualCaption}</figcaption>:null}</figure>:showDevelopmentPlaceholder?<figure className="expert-club__bonus-visual is-placeholder" role="img" aria-label={visualAlt}><span>{visualPlaceholder}</span>{visualDisclaimer?<small>{visualDisclaimer}</small>:null}{visualCaption?<figcaption>{visualCaption}</figcaption>:null}</figure>:null}<b>{labels.acceptedAnswer}</b>{lines.map(line=><p key={line}>{line}</p>)}</div>:null}</aside>;
}

function ProtectedRevealStep({kicker,title,lines,labels,onContinue,continueLabel}:{kicker:string;title:string;lines:readonly string[];labels:Labels;onContinue:()=>void;continueLabel:string}) {
  return <section className="expert-club__card"><small>{kicker}</small><h2>{title}</h2><HostOnlyAnswerPanel labels={labels} lines={lines} warning={labels.hostOnlyWarning}/><button className="expert-club__primary" onClick={onContinue}>{continueLabel}</button></section>;
}

function Celebration({state,group,nameA,nameB,labels,onContinue}:{state:ExpertClubState;group:string;nameA:string;nameB:string;labels:Labels;onContinue:()=>void}) {
  const tied=state.mode==="teams"&&state.scoreA===state.scoreB;
  const winner=state.scoreA>state.scoreB?nameA:nameB;
  return <section className="expert-club__card expert-club__celebration"><div className="expert-club__stars" aria-hidden="true">✦ ★ ✦ ★ ✦</div><span aria-hidden="true">🏆</span><h2>{state.mode==="cooperative"?labels.challengeComplete:tied?labels.tieWinners:labels.winners}</h2><strong>{state.mode==="cooperative"?group:tied?`${nameA} + ${nameB}`:winner}!</strong><p>{labels.finalScore}: <bdi dir="ltr">{state.mode==="teams"?`${state.scoreA} : ${state.scoreB}`:state.cooperativeSolved}</bdi></p><button className="expert-club__primary" onClick={onContinue}>{labels.finalInstructionButton}</button></section>;
}
