"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "./UserProvider";
import { useMembers } from "./MemberProvider";
import { getAllUsers } from "../app/api/airtable/airtable";

interface ProtectedPageProps {
  children: React.ReactNode;
}

export default function ProtectedPage({ children }: ProtectedPageProps) {
  const { user } = useUser();
  const { members, setMembers } = useMembers();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // 1. Hook para Hydration (Montagem no Cliente)
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Hook apenas para Autenticação e Redirecionamento
  useEffect(() => {
    if (!mounted) return;

    const savedUser = localStorage.getItem("user");
    if (!user && !savedUser) {
      router.replace("/login");
    }
  }, [user, router, mounted]);

  // 3. Hook apenas para Carregar Dados (Airtable)
  useEffect(() => {
    // Só carrega se estiver montado, se tiver user e se a lista estiver vazia
    const savedUser = localStorage.getItem("user");
    if (mounted && (user || savedUser) && members.length === 0) {
      getAllUsers()
        .then((fetchedMembers) => {
          setMembers(fetchedMembers);
        })
        .catch((err) => console.error("Erro ao carregar membros:", err));
    }
  }, [members.length, setMembers, mounted, user]);

  // Bloqueia renderização durante SSR para evitar erros de localStorage
  if (!mounted) return null;

  // Proteção visual simples enquanto o redirect não acontece
  const isAuth = user || localStorage.getItem("user");
  if (!isAuth) return null;

  return <>{children}</>;
}