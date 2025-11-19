import Link from "next/link";

/**
 * The Home class is the initial page of the application.
 *
 * @class Home
 */

/**
 * 
 * type User = {
  id: string;
  nome: string;
  department: string;
  funcao: string;
  istId: number;
};

  const { user, setUser, department, setDepartment, funcao, setFuncao };
  const hasPermission = (role: string): boolean => {
    const regex = /^(Sublíder|Líder)(?: de .+)?$/;
    return regex.test(role);
  };

  useEffect(() => {
    const fetchData = async () => {
      const data = await UserService.getUser(99461);
      setUser(data);
      setDepartment(data?.department || "");
      setFuncao(data?.funcao || "");
    }, [department, user?.funcao]);
    
    fetchData();
  }, [setUser, setDepartment]);

 */

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center">
      <Link
        href="/tlcrab"
        className="mt-5 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        TLCrab
      </Link>
    </main>
  );
}
