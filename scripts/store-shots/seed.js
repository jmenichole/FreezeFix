// Seeds demo state into the FreezeFix panel (only inside index.html)
(function(){
  if (!/index\.html$/.test(location.pathname) || !location.hash) return;
  const raw = (location.hash || '#none').slice(1); const mode = raw.replace('-light',''); const light = raw.endsWith('-light');
  localStorage.clear();
  const now = new Date();
  const task = (id, name, dur, pr) => ({ id, name, category:'work', priority:pr, duration:dur, deadline:null, scheduledStart:null, scheduledEnd:null, notes:'', subtasks:[], energy:'low', actionPlan:'do', bodyDouble:false, completed:false, completedAt:null, overdue:false, fromCalendar:false, createdAt: now.toISOString() });
  localStorage.setItem('adhd_tasks', JSON.stringify(mode === 'home' ? [ task(1,'Download Python from python.org',5,1), task(2,'Reply to Sam about Friday',10,2), task(3,'Start a load of laundry',5,3) ] : [ task(1,'Reply to Sam about Friday',10,1), task(2,'Start a load of laundry',5,3) ]));
  localStorage.setItem('adhd_next_id','4');
  localStorage.setItem('adhd_settings', JSON.stringify({ themeMode: light ? 'light' : 'dark', fontLegible: light }));
  const steps = [
    ['Download Python from python.org',5],
    ['Tick "Add Python to PATH" (lets the terminal find it)',1],
    ['Type python --version in a terminal',2],
    ['Write a one-line program that prints hello',5],
    ['Build a tiny number-guessing game',20]
  ].map((s,i)=>({ id:'d'+i, text:s[0], minutes:s[1], status:'todo' }));
  if (mode === 'step') { steps[0].status = 'done'; }
  if (mode === 'step' || mode === 'after') {
    localStorage.setItem('freezefix_unfreeze_session', JSON.stringify({
      gist: 'This is about starting Python from zero, one small piece at a time.',
      skip: "Python's history, library names and practice sites can wait.",
      steps, currentId: mode === 'step' ? 'd1' : 'd0', mode: 'ai', showAll: false, source: 'selection'
    }));
  }
})();
