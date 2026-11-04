(() => {
  const $ = id => document.getElementById(id);
  const state = {
    level: 1, mode: "mixed", seconds: 60, remaining: 60,
    stars: 0, correct: 0, total: 0, answered: false,
    sound: true, question: null, timer: null, inputDebounce: null,
    locked: false
  };

  // Google Analytics 4 event tracking
  function trackEvent(eventName, eventParams = {}) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, eventParams);
    }
  }

  const labels = {
    addition:"➕ ADDITION",
    subtraction:"➖ SUBTRACTION",
    multiplication:"✖️ MULTIPLICATION",
    division:"➗ DIVISION"
  };

  const levelNames = {
    1:"🌱 BEGINNER",
    2:"🌼 EASY",
    3:"🌟 MEDIUM",
    4:"🚀 HARD",
    6:"🏆 ADVANCED"
  };

  const rand=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
  const digits=n=>String(n).length;

  function rangeForLevel(){
    if(state.level===1)return [1,9];
    if(state.level===2)return [10,99];
    if(state.level===3)return [100,999];
    if(state.level===4)return [1000,9999];
    return [10000,999999];
  }

  function makeQuestion(){
    const mode=state.mode==="mixed"
      ?["addition","subtraction","multiplication","division"][rand(0,3)]
      :state.mode;

    const [min,max]=rangeForLevel();
    let a,b,answer,op;

    if(mode==="addition"){
      a=rand(min,max);
      b=rand(min,Math.max(min,Math.min(max,Math.pow(10,state.level===6?6:state.level)-1-a)));

      if(a+b>max*1.5){
        a=rand(min,max);
        b=rand(min,max-a);
      }

      answer=a+b;
      op="+";

    } else if(mode==="subtraction"){
      a=rand(min,max);
      b=rand(min,a);
      answer=a-b;
      op="−";

    } else if(mode==="multiplication"){
      a=rand(min,max);
      b=rand(2,9);

      while(a*b>999999){
        b=rand(2,Math.max(2,Math.floor(999999/a)));
      }

      answer=a*b;
      op="×";

    } else {
      const divisors = state.level===1 ? [2,3] : [2,3,4,5,6,7,8,9];
      let choices=[];

      for(const divisor of divisors){
        const low=Math.max(2,Math.ceil(min/divisor));
        const high=Math.floor(max/divisor);

        if(low<=high){
          choices.push({divisor,low,high});
        }
      }

      const pick=choices[rand(0,choices.length-1)];
      b=pick.divisor;
      answer=rand(pick.low,pick.high);
      a=b*answer;
      op="÷";
    }

    return {mode,a,b,answer,op};
  }

  function story(q){
    const {mode,a,b}=q;

    const templates={
      addition:[
        `You have ${a} marbles and find ${b} more. How many marbles do you have now?`,
        `A library has ${a} books and gets ${b} new books. How many books altogether?`
      ],

      subtraction:[
        `There are ${a} balloons. ${b} balloons are taken away. How many are left?`,
        `You collected ${a} stickers and gave ${b} away. How many remain?`
      ],

      multiplication:[
        `${a} groups have ${b} objects in each group. How many objects altogether?`,
        `There are ${a} boxes with ${b} pencils in each. How many pencils are there?`
      ],

      division:[
        `${a} sweets are shared equally among ${b} children. How many does each child get?`,
        `Share ${a} stars equally into ${b} groups. How many stars in each group?`
      ]
    };

    return templates[mode][rand(0,1)];
  }

  function formatTime(s){
    return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  }

  function updateTimer(){
    $("timerValue").textContent=formatTime(state.remaining);
    $("timerValue").classList.toggle("urgent",state.remaining<=10);
  }

  function stopClock(){
    if(state.timer){
      clearInterval(state.timer);
      state.timer=null;
    }
  }

  function startClock(){
    stopClock();
    state.remaining=state.seconds;
    updateTimer();

    state.timer=setInterval(()=>{
      if(state.answered)return;

      state.remaining--;
      updateTimer();

      if(state.remaining<=0){
        stopClock();
        finishAnswer(false,true);
      }
    },1000);
  }

  function render(){
    state.answered=false;
    state.locked=false;
    state.question=makeQuestion();

    const q=state.question;

    $("stars").textContent=state.stars;
    $("progressLabel").textContent=`Question ${state.total+1} • Endless practice`;
    $("progressBar").style.width=`${((state.total%10)+1)*10}%`;

    $("operationTag").textContent=labels[q.mode];
    $("levelTag").textContent=levelNames[state.level];
    $("story").textContent=story(q);

    $("equation").innerHTML=`${q.a} <span>${q.op}</span> ${q.b} <span>=</span> <b>?</b>`;

    $("answer").value="";
    $("answer").disabled=false;

    $("feedback").textContent="Type your answer. It will be checked automatically.";
    $("feedback").className="feedback";

    $("explanation").textContent="Try it yourself. Your steps and explanation will appear after your answer is checked.";

    $("hintBtn").disabled=false;
    $("skipBtn").disabled=false;

    startClock();
    $("answer").focus({preventScroll:true});
  }

  function step(n,txt){
    return `<div class="step"><span class="step-num">${n}</span><p>${txt}</p></div>`;
  }

  function explanation(q){
    const {mode,a,b,answer}=q;
    let out="";

    if(mode==="addition"){
      out+=step(1,`Line up the numbers by place value: ones under ones, tens under tens, hundreds under hundreds.`);
      out+=step(2,`Add from right to left. Ones: ${a%10} + ${b%10} = ${(a%10+b%10)%10}${a%10+b%10>=10?" ones; carry 1 ten":""}.`);
      out+=step(3,`Continue adding tens, hundreds and the other places. Remember to add any carried number.`);
      out+=step(4,`The total is <span class="visual">${answer}</span>. So ${a} + ${b} = <b>${answer}</b>.`);

    }else if(mode==="subtraction"){
      out+=step(1,`Line up ones under ones, tens under tens, and all other place values.`);
      out+=step(2,`Start from the right. If the top digit is smaller, exchange 1 from the next place for 10 in this place.`);
      out+=step(3,`Subtract each column from right to left. Check that each column is correct.`);
      out+=step(4,`The difference is <span class="visual">${answer}</span>. So ${a} − ${b} = <b>${answer}</b>.`);

    }else if(mode==="multiplication"){
      const tens=Math.floor(b/10),ones=b%10;

      out+=step(1,`Multiplication means equal groups. Here we have ${a} groups of ${b}.`);
      out+=step(2,`Break ${b} into place values if needed: ${tens?`${tens} tens and `:""}${ones} ones. Multiply ${a} by each part.`);
      out+=step(3,`Add the partial products to get the total. You can also check by repeated addition for small numbers.`);
      out+=step(4,`${a} × ${b} = <span class="visual">${answer}</span>.`);

    }else{
      out+=step(1,`Division means sharing equally. We have ${a} things and ${b} equal groups.`);
      out+=step(2,`Think: what number multiplied by ${b} gives ${a}?`);
      out+=step(3,`Check: ${b} × ${answer} = ${a}.`);
      out+=step(4,`So ${a} ÷ ${b} = <span class="visual">${answer}</span>.`);
    }

    return out;
  }

// Part 2

  function tone(ok=true){
    if(!state.sound)return;

    try{
      const C=window.AudioContext||window.webkitAudioContext;
      if(!C)return;

      const c=new C();
      const o=c.createOscillator();
      const g=c.createGain();

      o.connect(g);
      g.connect(c.destination);

      o.frequency.value=ok?660:220;
      g.gain.value=.06;

      o.start();
      o.stop(c.currentTime+.12);
      o.onended=()=>c.close();

    }catch(e){}
  }

  function finishAnswer(isCorrect,timedOut=false,skipped=false){
    if(state.answered)return;

    state.answered=true;
    stopClock();
    clearTimeout(state.inputDebounce);

    const q=state.question;
    state.total++;

    // Track answer, timeout and skipped questions in GA4
    trackEvent(skipped ? "question_skipped" : "question_answered", {
      operation:q.mode,
      level:state.level,
      correct:skipped ? false : isCorrect,
      timed_out:timedOut,
      question_number:state.total,
      time_remaining:state.remaining
    });

    $("answer").disabled=true;
    $("explanation").innerHTML=explanation(q);

    if(isCorrect){
      state.correct++;
      state.stars++;

      $("feedback").textContent="🌟 Brilliant! Correct answer. Next question is coming…";
      $("feedback").className="feedback good";

      tone(true);

    }else{
      $("feedback").textContent=timedOut
        ?`⏰ Time is up! The answer was ${q.answer}. Learn from the steps. Next question is coming…`
        :`Good try! The correct answer is ${q.answer}. Read the steps and learn. Next question is coming…`;

      $("feedback").className="feedback bad";
      tone(false);
    }

    $("stars").textContent=state.stars;

    $("hintBtn").disabled=true;
    $("skipBtn").disabled=true;

    state.locked=true;

    setTimeout(()=>render(),900);
  }

  function autoCheck(){
    if(state.answered||state.locked)return;

    const val=$("answer").value.trim();
    if(val==="")return;

    if(Number(val)===state.question.answer){
      finishAnswer(true);
      return;
    }

    state.inputDebounce=setTimeout(()=>{
      if(state.answered||state.locked)return;

      const current=$("answer").value.trim();

      if(current!=="" && Number(current)!==state.question.answer){
        finishAnswer(false);
      }
    },450);
  }

  function hint(){
    if(state.answered)return;

    const q=state.question;

    trackEvent("hint_used",{
      operation:q.mode,
      level:state.level
    });

    const hints={
      addition:"💡 Hint: Line up the digits by place value. Add from the ones column first.",

      subtraction:"💡 Hint: Line up the digits. If you cannot take away, exchange from the next place.",

      multiplication:`💡 Hint: Think of ${q.a} equal groups of ${q.b}. Multiply one place value at a time.`,

      division:`💡 Hint: Ask yourself: ${q.b} times what number makes ${q.a}?`
    };

    $("explanation").innerHTML=step("💡",hints[q.mode]);
  }

  function skip(){
    if(state.answered)return;

    finishAnswer(false,false,true);

    $("feedback").textContent=`Question skipped. The answer was ${state.question.answer}. Next question is coming…`;
  }

  function setLevel(level){
    state.level=Number(level);

    trackEvent("level_selected",{
      level:state.level
    });

    document.querySelectorAll(".topic").forEach(btn=>{
      btn.classList.toggle(
        "active",
        Number(btn.dataset.level)===state.level
      );
    });

    render();
  }

  document.querySelectorAll(".topic").forEach(btn=>{
    btn.addEventListener("click",()=>setLevel(btn.dataset.level));
  });

  $("timerSelect").addEventListener("change",e=>{
    state.seconds=Number(e.target.value);
    render();
  });

  $("operationSelect").addEventListener("change",e=>{
    state.mode=e.target.value;
    render();
  });

  $("answer").addEventListener("input",()=>{
    clearTimeout(state.inputDebounce);

    const v=$("answer").value.trim();
    if(v==="")return;

    // Correct answers are recognised immediately.
    if(Number(v)===state.question.answer){
      finishAnswer(true);
    }else{
      state.inputDebounce=setTimeout(autoCheck,1100);
    }
  });

  $("answer").addEventListener("keydown",e=>{
    if(e.key==="Enter")autoCheck();
  });

  $("hintBtn").addEventListener("click",hint);
  $("skipBtn").addEventListener("click",skip);

  $("soundBtn").addEventListener("click",()=>{
    state.sound=!state.sound;
    $("soundBtn").textContent=state.sound?"🔊":"🔇";
  });

  $("playAgainBtn").addEventListener("click",()=>{
    $("resultModal").classList.add("hidden");
    render();
  });

  render();
  stopClock();

  window.startMathAdventure=()=>render();

})();

// Part 3

// Home page, game navigation and WhatsApp share
(()=>{
  const $=id=>document.getElementById(id);

  const home=$("homeScreen");
  const game=$("gameScreen");

  let gameSessionStartedAt=0;

  // Google Analytics event helper
  function sendGameEvent(eventName,eventParams={}){
    if(typeof window.gtag==="function"){
      window.gtag("event",eventName,eventParams);
    }
  }

  function showHome(){

    // Track game duration when user returns to Home
    if(gameSessionStartedAt){
      const durationSeconds=Math.max(
        0,
        Math.round((Date.now()-gameSessionStartedAt)/1000)
      );

      sendGameEvent("game_duration",{
        duration_seconds:durationSeconds
      });

      gameSessionStartedAt=0;
    }

    home.classList.remove("hidden");
    game.classList.add("hidden");

    $("homeNav").classList.add("active");
    $("gameNav").classList.remove("active");

    window.scrollTo({
      top:0,
      behavior:"smooth"
    });
  }

  function showGame(){

    // Track a new game session
    if(!gameSessionStartedAt){
      gameSessionStartedAt=Date.now();

      sendGameEvent("game_started",{
        game_name:"Math Adventure"
      });
    }

    home.classList.add("hidden");
    game.classList.remove("hidden");

    $("gameNav").classList.add("active");
    $("homeNav").classList.remove("active");

    if(window.startMathAdventure){
      window.startMathAdventure();
    }

    window.scrollTo({
      top:0,
      behavior:"smooth"
    });
  }

  // Start game buttons
  ["startGameBtn","bottomStartBtn","gameNav"].forEach(id=>{
    $(id).addEventListener("click",showGame);
  });

  // Home navigation buttons
  ["homeBrand","homeNav"].forEach(id=>{
    $(id).addEventListener("click",e=>{
      e.preventDefault();
      showHome();
    });
  });

  // How to play button
  $("howToPlayBtn").addEventListener("click",()=>{
    $("howSection").scrollIntoView({
      behavior:"smooth",
      block:"start"
    });
  });

  // WhatsApp share
  $("shareBtn").addEventListener("click",()=>{

    const message="Try Math Adventure — a fun maths learning game with addition, subtraction, multiplication, division, levels and unlimited practice!";

    const shareUrl=window.location.href;

    window.open(
      "https://wa.me/?text="+encodeURIComponent(message+" "+shareUrl),
      "_blank",
      "noopener,noreferrer"
    );
  });

})();