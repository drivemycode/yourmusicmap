import { Link } from "react-router-dom";

const Header = () => {
    return (
        <div>
            <nav class="bg-gray-800 p-4 shadow-lg sticky top-0">
                <div class="space-x-4">
            <Link to={"/"}>
                <button class="text-gray-300 hover:text-white focus:outline-none">
                Where is your favourite artist from
                </button>
            </Link>
            <Link to={"/topartists"}>
                <button class="text-gray-300 hover:text-white focus:outline-none">
                Top artists map
                </button>
            </Link>
            <Link to={"/about"}>
                <button class="text-gray-300 hover:text-white focus:outline-none">
                About this page
                </button>
            </Link>
                </div>
            </nav>
        </div>
    )
}

export default Header;