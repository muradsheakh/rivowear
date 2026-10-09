"use client";

import { FaApple, FaFacebookF } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

const AuthSocialButtons = ({ action }: { action: "sign in" | "sign up" }) => {
  return (
    <>
      <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
        <span className="h-px flex-1 bg-gray-200" />
        <span>or {action} with</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          aria-label={`Continue with Google to ${action}`}
          className="flex h-11 items-center justify-center rounded-md border border-gray-200 transition hover:bg-gray-50"
        >
          <FcGoogle className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label={`Continue with Facebook to ${action}`}
          className="flex h-11 items-center justify-center rounded-md border border-gray-200 text-[#1877f2] transition hover:bg-gray-50"
        >
          <FaFacebookF className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label={`Continue with Apple to ${action}`}
          className="flex h-11 items-center justify-center rounded-md border border-gray-200 text-black transition hover:bg-gray-50"
        >
          <FaApple className="h-5 w-5" />
        </button>
      </div>
    </>
  );
};

export default AuthSocialButtons;
