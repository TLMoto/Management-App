"use client";
import { useEffect, useState } from "react";
import { useUserId } from "../../components/UserIdProvider";
import { useRouter } from "next/navigation";
import { UserService } from "../../../api/airtable";

export default function Login() {
  const { userId, setUserId } = useUserId();
  const [input, setInput] = useState("");
  const router = useRouter();

  useEffect(() => {
    const savedId = localStorage.getItem("userId");
    if (savedId) {
      setInput(savedId);
    }
  }, [setUserId]);

  const handleLogin = async () => {
    if (input.trim() !== "") {
      if (await UserService.getUser(Number(input))) {
        setUserId(input);
        router.push("/pessoal");
      } else {
        alert("Número IST inválido. Tente novamente.");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <main className="flex flex-col items-center text-center bg-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-black">Insere o teu número</h1>

        <input
          className="mt-4 p-2 text-center w-[80%] outline outline-1 outline-blue-600 rounded-lg text-black"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              handleLogin(); // your function
            }
          }}
        />

        <button onClick={handleLogin} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">
          Login
        </button>
      </main>
    </div>
  );
}
