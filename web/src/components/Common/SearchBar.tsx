"use client";

import { useState } from "react";
import { useNavigate } from "@/shared/router";
import { HiMagnifyingGlass, HiXMark } from "react-icons/hi2";

const SearchBar = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleSearchToggle = () => {
    setIsOpen(!isOpen);
  };

 
  const handleSearch = (e: React.SubmitEvent) => {
    e.preventDefault();

    const trimmedTerm = searchTerm.trim();

    if (trimmedTerm) {
      navigate(`/shop?q=${encodeURIComponent(trimmedTerm)}`);
      setSearchTerm("");
      setIsOpen(false);
    }
  };

  return (
    <div
      className={`flex items-center justify-center transition-all duration-300 ${
        isOpen
          ? "fixed top-0 left-0 z-50 h-24 w-full bg-white px-4 shadow-md"
          : "w-auto"
      }`}
    >
      {isOpen ? (
        <form
          onSubmit={handleSearch}
          className="relative flex w-full max-w-2xl items-center justify-center"
        >
          <div className="relative w-full md:w-3/4">
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 pr-10 placeholder:text-gray-500 focus:outline-none"
            />
            <button
              type="submit"
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-black"
            >
              <HiMagnifyingGlass className="h-5 w-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSearchToggle}
            className="ml-3 rounded-full p-2 transition-colors hover:bg-gray-200"
          >
            <HiXMark className="h-6 w-6 text-gray-600" />
          </button>
        </form>
      ) : (
        <button
          onClick={handleSearchToggle}
          className="rounded-full p-2 transition-colors hover:bg-gray-100"
        >
          <HiMagnifyingGlass className="h-6 w-6 text-gray-700" />
        </button>
      )}
    </div>
  );
};

export default SearchBar;