import Link from "next/link";

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center p-4 text-white">
      <Link href="/" className="text-xl font-bold">
        Vercel Clone
      </Link>
      <div>
        <Link href="/logs" className="mr-4">
          Logs
        </Link>
        <Link href="/submission">Submission</Link>
      </div>
    </nav>
  );
};

export default Navbar;
