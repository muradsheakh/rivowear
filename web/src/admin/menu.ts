import {
  HiOutlineChartBar,
  HiOutlineClipboardList,
  HiOutlineCog,
  HiOutlineCube,
  HiOutlineMail,
  HiOutlineStar,
  HiOutlineTicket,
  HiOutlineUsers,
} from "react-icons/hi";

export const adminMenu = [
  { label: "Dashboard", to: "/admin", icon: HiOutlineChartBar, end: true },
  { label: "Orders", to: "/admin/orders", icon: HiOutlineClipboardList, end: false },
  { label: "Products", to: "/admin/products", icon: HiOutlineCube, end: false },
  { label: "Reviews", to: "/admin/reviews", icon: HiOutlineStar, end: false },
  { label: "Coupons", to: "/admin/coupons", icon: HiOutlineTicket, end: false },
  { label: "Customers", to: "/admin/customers", icon: HiOutlineUsers, end: false },
  { label: "Failed messages", to: "/admin/messages", icon: HiOutlineMail, end: false },
  { label: "Settings", to: "/admin/settings", icon: HiOutlineCog, end: false },
];
