import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { MEMBER_COLORS, getFamilyCode } from "@/lib/familyStore";
import { motion } from "framer-motion";
import moment from "moment";

export default function ActivityFeed() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadLogs();
  }, []);

  const familyCode = getFamilyCode();

  const loadLogs = async () => {
    const all = await db.ActivityLog.filter({ family_code: familyCode });
    const data = [...all].sort((a,b) => new Date(b.created_date) - new Date(a.created_date)).slice(0,10);
    setLogs(data);
  };

  return (
    <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="font-heading font-bold text-lg mb-4">Family Activity 📡</h3>
      
      {logs.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-4">No activity yet — go do something! 🚀</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log, i) => {
            const color = MEMBER_COLORS[log.member_color] || MEMBER_COLORS.purple;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5 shrink-0"
                  style={{ background: color.hex }}
                >
                  {log.member_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold" style={{ color: color.hex }}>{log.member_name}</span>{' '}
                    {log.message}
                  </p>
                  <p className="text-xs text-muted-foreground">{moment(log.created_date).fromNow()}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}