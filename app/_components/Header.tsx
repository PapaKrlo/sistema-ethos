import Image from "next/image"
import Link from "next/link"

export default function Header() {
  return (
    <header className="bg-[#024728] h-[70px] flex items-center justify-between px-8">
      <Image src="/logo.svg" alt="Logo" width={150} height={50} />
      <Link href="/login">
        <button className="bg-[#008A4B] font-dmSans text-white py-2 px-6 hover:bg-[#006837] transition-colors rounded-lg">
          Iniciar sesión
        </button>
      </Link>
    </header>
  )
}

