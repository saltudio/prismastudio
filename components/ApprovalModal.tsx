import React from "react";
import { logout } from "../auth";

type Props = {
  status: "pending" | "approved" | "blocked";
  email: string;
  uid: string;
};

const ADMIN_WA_PHONE = "628990017000"; // wa.me format

const ApprovalModal: React.FC<Props> = ({ status, email, uid }) => {
  const isBlocked = status === "blocked";
  const title = isBlocked ? "ACCESS BLOCKED" : "PENDING APPROVAL";
  
  const waText = `PRISMA Studio Approval Request\nEmail: ${email}\nUID: ${uid}\nStatus: ${status}`;
  const waLink = `https://wa.me/${ADMIN_WA_PHONE}?text=${encodeURIComponent(waText)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-brutal-bg dark:bg-brutal-dark p-6">
      <div className="w-full max-w-md bg-white dark:bg-brutal-dark border-4 border-brutal-dark shadow-brutal p-8 text-center animate-fade-in-up">
        <h2 className={`font-display font-black text-3xl mb-4 uppercase tracking-tighter ${isBlocked ? "text-red-600" : "text-brutal-yellow drop-shadow-[2px_2px_0px_#000]"}`}>
          {title}
        </h2>
        <p className="font-mono text-sm mb-8 text-brutal-dark dark:text-white/70 leading-relaxed">
          {isBlocked 
            ? "Your account access has been restricted. Please contact the administrator for more information."
            : "Your account is currently waiting for admin approval. Please contact the administrator to activate your access."}
        </p>

        <div className="space-y-4">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-brutal-dark p-4 font-display font-black text-base uppercase text-brutal-dark dark:text-white border-4 border-brutal-dark shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412.001 12.049a11.82 11.82 0 001.578 5.919L0 24l6.135-1.61a11.803 11.803 0 005.911 1.592h.005c6.637 0 12.048-5.412 12.052-12.05a11.815 11.815 0 00-3.266-8.525z" fill="#25D366"/>
            </svg>
            HUBUNGI ADMIN
          </a>

          <button
            onClick={logout}
            className="w-full font-display font-black text-xs uppercase p-3 text-brutal-dark dark:text-white/40 hover:text-red-500 transition-colors"
          >
            Sign Out
          </button>
        </div>

        <div className="mt-8 pt-6 border-t-2 border-dashed border-brutal-dark/20 text-[10px] font-mono text-brutal-dark/40 dark:text-white/20 text-left">
           <div className="truncate">UID: {uid}</div>
           <div className="truncate">EMAIL: {email}</div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;