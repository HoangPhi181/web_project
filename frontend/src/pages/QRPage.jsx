import {React} from 'react'

function Header(){
    return(
    <header>
        <h1>CỔNG THANH TOÁN</h1>
        <br />
        <h1>MOMO</h1>
        <h3>QR</h3>
    </header>
    )
}


export default function QRPage() {    
    return (
    <>
        <style>
        {` 
            header{
                color: white;
            } 
            header h1{
                font-size: 20px;
            }
            
            
        `}      
        </style>

        <div>
            <Header/>
        </div>
    </>
    )

}
