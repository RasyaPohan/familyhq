import { useState, useEffect, useRef } from "react";
import { db, uploadMomentPhoto } from "@/lib/db";
import { getActiveMember, getFamilyCode, MEMBER_COLORS } from "@/lib/familyStore";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Send } from "lucide-react";
import confetti from "canvas-confetti";

const REACTIONS = [
  { key: "heart", emoji: "❤️" },
  { key: "laugh", emoji: "😂" },
  { key: "fire", emoji: "🔥" },
  { key: "clap", emoji: "👏" },
  { key: "love", emoji: "😍" },
];

const EMOJI_TAGS = ["🌅", "🎉", "🍕", "❤️", "😂", "🏆", "🌿", "🎮", "🐾", "✨"];

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function PhotoCard({ photo, member, onOpen, onReact }) {
  const color = MEMBER_COLORS[photo.member_color] || MEMBER_COLORS.purple;
  const isNew = (Date.now() - new Date(photo.created_date)) / 1000 < 120;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative rounded-2xl overflow-hidden bg-[#1a1a2e] border border-white/10 cursor-pointer group"
      onClick={() => onOpen(photo)}
    >
      {isNew && (
        <div className="absolute top-2 left-2 z-10 bg-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-purple-500/40">
          NEW ✨
        </div>
      )}
      <img
        src={photo.photo_url}
        alt={photo.caption || "Family moment"}
        className="w-full object-cover max-h-72 group-hover:scale-[1.02] transition-transform duration-300"
        loading="lazy"
      />
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${color.bg}`}>
            {photo.member_emoji || photo.member_name[0]}
          </div>
          <span className="text-white/70 text-xs font-medium">{photo.member_name}</span>
          <span className="text-white/30 text-xs ml-auto">{timeAgo(photo.created_date)}</span>
        </div>
        {photo.caption && <p className="text-white/90 text-sm leading-snug mb-2">{photo.emoji_tag} {photo.caption}</p>}
        {/* Reactions row */}
        <div className="flex flex-wrap gap-1" onClick={e => e.stopPropagation()}>
          {REACTIONS.map(r => {
            const list = photo.reactions?.[r.key] || [];
            const count = list.length;
            const mine = member && list.includes(member.id);
            return (
              <button
                key={r.key}
                onClick={() => onReact(photo, r.key)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${
                  mine ? "bg-purple-600/60 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
                } ${count === 0 ? "opacity-40" : ""}`}
              >
                {r.emoji} {count > 0 && <span>{count}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

function PhotoModal({ photo, member, onClose, onReact }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const familyCode = getFamilyCode();

  useEffect(() => {
    db.PhotoComment.filter({ photo_id: photo.id }).then(setComments);
  }, [photo.id]);

  const handleComment = async () => {
    if (!commentText.trim() || !member) return;
    setPosting(true);
    const c = await db.PhotoComment.create({
      family_code: familyCode,
      photo_id: photo.id,
      text: commentText.trim(),
      member_id: member.id,
      member_name: member.name,
      member_color: member.color,
      member_emoji: member.emoji,
    });
    setComments(prev => [...prev, c]);
    setCommentText("");
    setPosting(false);
  };

  const color = MEMBER_COLORS[photo.member_color] || MEMBER_COLORS.purple;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-black/90 flex flex-col overflow-hidden"
      onClick={onClose}
    >
      <div className="flex-1 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${color.bg}`}>
              {photo.member_emoji || photo.member_name[0]}
            </div>
            <span className="text-white font-medium text-sm">{photo.member_name}</span>
            <span className="text-white/40 text-xs">{timeAgo(photo.created_date)}</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <img src={photo.photo_url} alt="" className="w-full max-h-[55vh] object-contain" />

        <div className="p-4 space-y-3">
          {photo.caption && (
            <p className="text-white text-base">{photo.emoji_tag} {photo.caption}</p>
          )}
          {/* Reactions */}
          <div className="flex flex-wrap gap-2">
            {REACTIONS.map(r => {
              const list = photo.reactions?.[r.key] || [];
              const count = list.length;
              const mine = member && list.includes(member.id);
              return (
                <button
                  key={r.key}
                  onClick={() => onReact(photo, r.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-all ${
                    mine ? "bg-purple-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
                  }`}
                >
                  {r.emoji} {count > 0 && <span className="font-semibold">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Comments */}
          <div className="border-t border-white/10 pt-3 space-y-3">
            <p className="text-white/40 text-xs uppercase tracking-wide">Comments</p>
            {comments.length === 0 && (
              <p className="text-white/30 text-sm">No comments yet...</p>
            )}
            {comments.map(c => {
              const cc = MEMBER_COLORS[c.member_color] || MEMBER_COLORS.purple;
              return (
                <div key={c.id} className="flex items-start gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 ${cc.bg}`}>
                    {c.member_emoji || c.member_name[0]}
                  </div>
                  <div>
                    <span className="text-white/70 text-xs font-semibold">{c.member_name} </span>
                    <span className="text-white text-sm">{c.text}</span>
                    <p className="text-white/30 text-[10px] mt-0.5">{timeAgo(c.created_date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comment input */}
      <div className="px-4 py-3 bg-black/80 backdrop-blur-sm border-t border-white/10 flex gap-2 items-center" onClick={e => e.stopPropagation()}>
        <input
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleComment()}
          placeholder="Add a comment..."
          className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-purple-500"
        />
        <button
          onClick={handleComment}
          disabled={posting || !commentText.trim()}
          className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </div>
    </motion.div>
  );
}

export default function MomentsPage() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openPhoto, setOpenPhoto] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const [showUpload, setShowUpload] = useState(urlParams.get('upload') === 'true');
  const [caption, setCaption] = useState("");
  const [emojiTag, setEmojiTag] = useState("✨");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const member = getActiveMember();
  const familyCode = getFamilyCode();

  useEffect(() => {
    loadPhotos();
    // Mark moments as seen
    localStorage.setItem(`moments_seen_${familyCode}`, Date.now().toString());
  }, []);

  const loadPhotos = async () => {
    const data = await db.FamilyPhoto.filter({ family_code: familyCode });
    setPhotos(data);
    setLoading(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !member) return;
    setUploading(true);
    const file_url = await uploadMomentPhoto(file, familyCode);
    await db.FamilyPhoto.create({
      family_code: familyCode,
      photo_url: file_url,
      caption: caption.trim(),
      emoji_tag: emojiTag,
      member_id: member.id,
      member_name: member.name,
      member_color: member.color,
      member_emoji: member.emoji,
      reactions: { heart: [], laugh: [], fire: [], clap: [], love: [] },
      comment_count: 0,
    });
    setCaption("");
    setEmojiTag("✨");
    setShowUpload(false);
    setUploading(false);
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ["#8B5CF6","#EC4899","#F59E0B"] });
    loadPhotos();
  };

  const handleReact = async (photo, reactionKey) => {
    if (!member) return;
    const reactions = { ...(photo.reactions || { heart: [], laugh: [], fire: [], clap: [], love: [] }) };
    const list = [...(reactions[reactionKey] || [])];
    const idx = list.indexOf(member.id);
    if (idx === -1) list.push(member.id);
    else list.splice(idx, 1);
    reactions[reactionKey] = list;
    await db.FamilyPhoto.update(photo.id, { reactions });
    setPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, reactions } : p));
    if (openPhoto?.id === photo.id) setOpenPhoto(prev => ({ ...prev, reactions }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0a0a14]/90 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-white text-xl font-bold">Moments 📸</h1>
          <p className="text-white/40 text-xs">{photos.length} family {photos.length === 1 ? "memory" : "memories"}</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)" }}
        >
          <Camera className="w-4 h-4" /> Add Photo
        </button>
      </div>

      {/* Grid */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
            <div className="text-6xl">📸</div>
            <h2 className="font-heading text-white text-xl font-bold">No memories yet...</h2>
            <p className="text-white/40 text-sm">Be the first to capture a moment!</p>
            <button
              onClick={() => setShowUpload(true)}
              className="mt-2 px-6 py-3 rounded-2xl text-white font-semibold text-base"
              style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)", boxShadow: "0 4px 24px rgba(124,58,237,0.45)" }}
            >
              📷 Upload First Photo
            </button>
          </div>
        ) : (
          <div className="columns-2 gap-3 space-y-3">
            {photos.map(photo => (
              <div key={photo.id} className="break-inside-avoid mb-3">
                <PhotoCard photo={photo} member={member} onOpen={setOpenPhoto} onReact={handleReact} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Sheet */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/70 flex items-end"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="w-full bg-[#111122] rounded-t-3xl p-6 space-y-4"
              style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom) + 5rem)" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-2" />
              <h3 className="font-heading text-white text-lg font-bold text-center">Share a Moment 📸</h3>

              <div>
                <label className="text-white/50 text-xs mb-1 block">Emoji Tag</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_TAGS.map(e => (
                    <button key={e} onClick={() => setEmojiTag(e)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${emojiTag === e ? "bg-purple-600/60 ring-2 ring-purple-500" : "bg-white/10"}`}
                    >{e}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">Caption (optional)</label>
                <input
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="What's happening?..."
                  className="w-full bg-white/10 text-white placeholder-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full py-4 rounded-2xl text-white font-heading font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #7C3AED, #DB2777)", boxShadow: "0 4px 24px rgba(124,58,237,0.4)" }}
              >
                {uploading ? "Uploading... ⏳" : <><Camera className="w-5 h-5" /> Choose Photo</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Modal */}
      <AnimatePresence>
        {openPhoto && (
          <PhotoModal
            photo={openPhoto}
            member={member}
            onClose={() => setOpenPhoto(null)}
            onReact={handleReact}
          />
        )}
      </AnimatePresence>
    </div>
  );
}