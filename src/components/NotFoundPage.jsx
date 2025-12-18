import { Link } from "react-router-dom";

const NotFoundPage = () => {
    return (
        <div>
            <h1 class="mb-4 text-4xl font-bold tracking-tight text-heading md:text-5xl lg:text-6xl">Not found page</h1>
            <Link to={"/"}>
                <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Go back home</button>
            </Link>
        </div>
    )
}

export default NotFoundPage