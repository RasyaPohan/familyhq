import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X, ChevronRight, CheckCircle2 } from "lucide-react";

const STEPS = {
  Parent: [
    { emoji: "🏠", title: "Welcome to The Yanwar's HQ!", body: "Your family's command center. Let's get it set up!", path: null },
    { emoji: "📅", title: "Add your first event", body: "Pop something on the family calendar — a dinner, a birthday, anything!", path: "/calendar", cta: "Open Calendar" },
    { emoji: "✅", title: "Set up the chore board", body: "Assign chores, earn XP, make it a game!", path: "/chores", cta: "Set Up Chores" },
    { emoji: "🍽️", title: "Plan tonight's dinner", body: "Start the meal planner so nobody has to ask \"what's for dinner?\"", path: "/meals", cta: "Open Meals" },
    { emoji: "🎯", title: "Set a family goal", body: "A vacation, a gadget — something you're all saving toward.", path: "/goals", cta: "Add a Goal" },
    { emoji: "📌", title: "Post the first note", body: "Drop something on the family board — reminder, joke, anything!", path: "/noticeboard", cta: "Open Board" },
    { emoji: "🚀", title: "You're all set!", body: "The Yanwar's HQ is ready. Go make it home!", path: null },
  ],
  Teen: [
    { emoji: "🟣", title: "Hey Rasya! You made it!", body: "Welcome to your HQ. This is where the whole family stays in sync.", path: null },
    { emoji: "📅", title: "Got plans this week?", body: "Add something to the family calendar — a hangout, a school event.", path: "/calendar", cta: "Open Calendar" },
    { emoji: "✅", title: "Your chores are waiting...", body: "Complete a chore, earn XP. The leaderboard is public. 👀", path: "/chores", cta: "Check Chores" },
    { emoji: "🍕", title: "Vote on dinner!", body: "You have a say in what the family eats. Use your power wisely.", path: "/meals", cta: "Vote on Meals" },
    { emoji: "📢", title: "Drop a note on the board", body: "Say something to the family. A meme request, a complaint — it's yours.", path: "/noticeboard", cta: "Post a Note" },
    { emoji: "🚀", title: "Here's your HQ!", body: "Everything's set. Let's go!", path: null },
  ],
  Kid: [
    { emoji: "🎮", title: "HEY! You made it!", body: "Welcome to the family HQ! This is YOUR place too.", path: null },
    { emoji: "💥", title: "Chores = XP = Level Up!", body: "Every chore you smash earns you points. Go destroy one!", path: "/chores", cta: "Smash Chores 💥" },
    { emoji: "👑", title: "You have POWER here!", body: "Vote on what the family eats tonight. Your vote counts!", path: "/meals", cta: "Vote on Dinner" },
    { emoji: "😂", title: "Write something on the board!", body: "A joke, a drawing request — the family board is all yours.", path: "/noticeboard", cta: "Post Something" },
    { emoji: "🚀", title: "LET'S GOOO!", body: "Your HQ is ready. Welcome to the squad!", path: null },
  ],
};

const ONBOARDING_KEY = 'hq_onboarding';

export function startOnboarding(member) {
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ memberId: member.id, role: member.role, step: 0 }));
}

export function clearOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}

export function getOnboardingState() {
  const raw = localStorage.getItem(ONBOARDING_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function markOnboarded(memberId) {
  localStorage.setItem(`onboarded_${memberId}`, '1');
}

export function isOnboarded(memberId) {
  return !!localStorage.getItem(`onboarded_${memberId}`);
}

const GUIDE_PROMPT_KEY = 'hq_guide_prompted';

export default function OnboardingWizard() {
  const [state, setState] = useState(getOnboardingState);
  const [stepDone, setStepDone] = useState(false);
  const [showGuidePrompt, setShowGuidePrompt] = useState(false);
  const navigate = useNavigate();

  // Poll localStorage for changes (e.g. when FamilySelect starts onboarding)
  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = getOnboardingState();
      setState(prev => {
        const prevStr = JSON.stringify(prev);
        const freshStr = JSON.stringify(fresh);
        return prevStr !== freshStr ? fresh : prev;
      });
    }, 300);
    return () => clearInterval(interval);
  }, []);

  if (!state) return null;

  const steps = STEPS[state.role] || STEPS.Kid;
  const current = steps[state.step];
  const isLast = state.step === steps.length - 1;
  const progress = ((state.step + 1) / steps.length) * 100;

  const saveStep = (newStep) => {
    const newState = { ...state, step: newStep };
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(newState));
    setState(newState);
    setStepDone(false);
  };

  const handleNext = () => {
    if (isLast) {
      markOnboarded(state.memberId);
      clearOnboarding();
      const alreadyPrompted = localStorage.getItem(`${GUIDE_PROMPT_KEY}_${state.memberId}`);
      if (!alreadyPrompted) {
        setShowGuidePrompt(true);
        localStorage.setItem(`${GUIDE_PROMPT_KEY}_${state.memberId}`, '1');
      }
      setState(null);
    } else {
      saveStep(state.step + 1);
    }
  };

  const handleCTA = () => {
    if (current.path) {
      navigate(current.path);
      setStepDone(true);
    }
  };

  const handleSkipAll = () => {
    markOnboarded(state.memberId);
    clearOnboarding();
    setState(null);
  };

  if (showGuidePrompt) {
    return (
      <>
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" />
        <div className="fixed left-0 right-0 z-[210] md:left-1/2 md:-translate-x-1/2 md:w-[420px] md:bottom-8" style={{ bottom: "env(safe-area-inset-bottom, 0px)", left: "56px" }}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl p-6 pb-10 md:pb-6">
            <p className="text-4xl mb-3 text-center">📖</p>
            <p className="font-heading font-bold text-white text-lg text-center mb-1">Want a quick guide?</p>
            <p className="text-white/50 text-sm text-center mb-5">Learn how XP, levels, streaks and rewards work.</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowGuidePrompt(false); navigate('/guide'); }}
                className="flex-1 py-3 rounded-2xl font-heading font-bold text-white text-sm"
                style={{ background: 'linear-gradient(135deg,#8B5CF6,#EC4899)' }}
              >
                Yes, show me! 🚀
              </button>
              <button
                onClick={() => setShowGuidePrompt(false)}
                className="px-5 py-3 rounded-2xl text-white/40 hover:text-white/70 text-sm transition-colors bg-white/5"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Top progress bar — always visible */}
      <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-black/30">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Floating bottom card */}
      <AnimatePresence>
        <motion.div
          key={state.step}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="fixed right-0 z-[150] md:left-1/2 md:-translate-x-1/2 md:w-[480px] md:bottom-6"
          style={{ bottom: "env(safe-area-inset-bottom, 0px)", left: "56px" }}
        >
          <div className="bg-[#1a1a2e] border border-white/10 rounded-t-3xl md:rounded-3xl shadow-2xl p-5 pb-8 md:pb-5">
            {/* Step counter + skip */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-white/40 font-medium">Step {state.step + 1} of {steps.length}</span>
              <button onClick={handleSkipAll} className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1">
                Skip full tour <X className="w-3 h-3" />
              </button>
            </div>

            {/* Content */}
            <div className="flex items-start gap-4">
              <div className="text-4xl shrink-0">{current.emoji}</div>
              <div className="flex-1">
                <h3 className="font-heading font-bold text-white text-base mb-1">{current.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{current.body}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4">
              {current.path && !stepDone && (
                <button
                  onClick={handleCTA}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}
                >
                  {current.cta} →
                </button>
              )}
              <button
                onClick={handleNext}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  stepDone || !current.path || isLast
                    ? 'flex-1 text-white bg-purple-600 hover:bg-purple-500'
                    : 'px-4 text-white/50 bg-white/5 hover:bg-white/10'
                }`}
              >
                {isLast ? (
                  <><CheckCircle2 className="w-4 h-4" /> Done!</>
                ) : stepDone ? (
                  <>Nice! Next step <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <>Skip step <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </div>

            {/* Dot indicators */}
            <div className="flex justify-center gap-1.5 mt-4">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all ${
                    i === state.step ? 'w-5 h-1.5 bg-purple-400' :
                    i < state.step ? 'w-1.5 h-1.5 bg-purple-700' :
                    'w-1.5 h-1.5 bg-white/15'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}