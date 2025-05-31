
import { Outlet } from "react-router-dom";
import Header from "@/components/header.jsx";

export const PublicLayout = () => {
    return (


        <div>
            <Header/>
            <div className="w-full">

                <Outlet/>


            </div>
        </div>


    )
}