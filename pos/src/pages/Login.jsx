import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/config/axiosConfig";
import { useCartStore } from "../store/cartStore";
import { Building2, AlertTriangle } from "lucide-react"; // Lucide icons
import { Button } from "@/components/ui/button"; // Assuming you have a Button component
import { Input } from "@/components/ui/input"; // Assuming you have an Input component
import { Label } from "@/components/ui/label"; // Assuming you have a Label component
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
	CardFooter,
} from "@/components/ui/card"; // Assuming Card components

const Login = () => {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState(null);
	const navigate = useNavigate();

	const handleLogin = async (e) => {
		e.preventDefault();
		setError(null); // Reset errors before new request

		try {
			await axiosInstance.post("/auth/login/", { username, password });
			useCartStore.getState().clearCart(); // This will clear orderId, cart, etc.

			navigate("/dashboard"); // Redirect user to dashboard on success
		} catch (error) {
			console.error("Error logging in:", error);
			setError("Invalid username or password. Please try again."); // More user-friendly message
		}
	};

	return (
		<div className="flex h-screen w-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 p-4">
			<Card className="w-full max-w-md shadow-2xl">
				<CardHeader className="text-center">
					<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
						<Building2 className="h-6 w-6 text-primary" />
					</div>
					<CardTitle className="text-2xl font-bold tracking-tight text-foreground">
						Welcome Back
					</CardTitle>
					<CardDescription className="text-muted-foreground">
						Please sign in to access your Ajeen POS dashboard.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{error && (
						<div
							role="alert"
							className="mb-4 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
						>
							<AlertTriangle className="h-4 w-4 flex-shrink-0" />
							<span>{error}</span>
						</div>
					)}
					<form
						onSubmit={handleLogin}
						className="space-y-4"
					>
						<div className="space-y-1.5">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								type="text"
								placeholder="Enter your username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								required
								className="h-10" // Consistent height
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="h-10" // Consistent height
							/>
						</div>
						<Button
							type="submit"
							className="w-full h-10"
						>
							Sign In
						</Button>
					</form>
				</CardContent>
				<CardFooter className="text-center text-xs text-muted-foreground pt-4">
					© {new Date().getFullYear()} Ajeen POS. All rights reserved.
				</CardFooter>
			</Card>
		</div>
	);
};

export default Login;
