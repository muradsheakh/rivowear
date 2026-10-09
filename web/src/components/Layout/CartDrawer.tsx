"use client";

import { useEffect } from "react";
import { IoMdClose } from "react-icons/io";
import CartContents from "../Cart/CartContents";
import { useNavigate } from "@/shared/router";

interface CartDrawerProps {
  drawerOpen: boolean;
  onClose: () => void;
}

const CartDrawer = ({ drawerOpen, onClose }: CartDrawerProps) => {
  const navigate = useNavigate();
  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen, onClose]);

  return (
    <>
      {drawerOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
          aria-label="Close cart"
        />
      )}
      
      {/* Main Drawer Container  */}
      <div
        className={`fixed top-0 right-0 z-50 flex h-full w-3/4 flex-col bg-white shadow-lg transition-transform duration-300 sm:w-1/2 md:w-1/4 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* 1. Header Section */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">Your Cart</h2>
          <button type="button" onClick={onClose} aria-label="Close cart">
            <IoMdClose className="h-6 w-6 text-gray-600 hover:text-black" />
          </button>
        </div>

        {/* 2. Scrollable Cart Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Component for the Cart Contents / Items */}
          <div className="space-y-4">
            {/* Cart Products Items  */}
             <CartContents />
           
          </div>
        </div>

        {/* 3. Fixed Checkout Footer */}
        <div className="border-t bg-white p-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate("/checkout");
            }}
            className="w-full rounded-lg bg-black py-3 font-semibold text-white transition hover:bg-gray-800"
          >
            Checkout
          </button>
          <p className="text-sm tracking-tighter text-gray-500 mt-2 text-center">
            Shipping, taxes and discount codes calculated at checkout.
          </p>
        </div>
      </div>
    </>
  );
};

export default CartDrawer;