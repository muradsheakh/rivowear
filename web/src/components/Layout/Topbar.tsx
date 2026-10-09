"use client";

const Topbar = () => {
  return (
    <div className="bg-rabbit-red text-white">
      <div className="conainer mx-auto flex items-center justify-between px-4 py-3">
        <div className="grow text-center text-sm">
          <span>Fast and reliable delivery across Bangladesh</span>
        </div>
        <div className="hidden text-sm md:block">
          <a href="tel:+8801701979554" className="hover:text-gray-300">
            +8801701979554
          </a>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
