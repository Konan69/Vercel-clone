import Link from "next/link";

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center p-4 text-white">
      <Link href="/" className="text-xl font-bold">
        Vercel Clone
      </Link>
      <div>by Konan</div>
    </nav>
  );
};

export default Navbar;
