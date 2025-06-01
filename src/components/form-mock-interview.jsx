import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

import { chatSession } from "@/scripts/index.js";
import {
    addDoc,
    collection,
    doc,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { db } from "@/config/firebase.config";

const formSchema = z.object({
    position: z.string().min(1, "Position is required").max(100),
    description: z.string().min(10, "Description is required"),
    experience: z.coerce.number().min(0, "Experience cannot be negative"),
    techStack: z.string().min(1, "Tech stack is required"),
});

export const FormMockInterview = ({ initialData }) => {
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: initialData || {},
    });

    const { isValid } = form.formState;
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { userId } = useAuth();

    const actions = initialData ? "Save Changes" : "Create";
    const toastMessage = initialData
        ? { title: "Updated..!", description: "Changes saved successfully..." }
        : { title: "Created..!", description: "New Mock Interview created..." };

    const cleanAiResponse = (text) => {
        let cleaned = text.trim().replace(/(json|```|`)/g, "");
        const match = cleaned.match(/\[.*]/s);
        if (!match) throw new Error("Invalid AI format");
        return JSON.parse(match[0]);
    };

    const generateAiSection = async (sectionType, data) => {
        const prompt = `
Generate 5 ${sectionType} interview questions and answers in the format:
[
  { "question": "Q", "answer": "A" },
  ...
]

Based on:
- Position: ${data.position}
- Description: ${data.description}
- Experience: ${data.experience}
- Tech Stack: ${data.techStack}

Return only the JSON array.`;

        const aiResult = await chatSession.sendMessage(prompt);
        return cleanAiResponse(aiResult.response.text());
    };

    const onSubmit = async (data) => {
        try {
            setLoading(true);

            const sections = [
                { type: "Technical", questions: await generateAiSection("Technical", data) },
                { type: "HR", questions: await generateAiSection("HR", data) },
                { type: "Behavioral", questions: await generateAiSection("Behavioral", data) },
                { type: "Soft Skills", questions: await generateAiSection("Soft Skills", data) },
            ];

            if (initialData) {
                await updateDoc(doc(db, "interviews", initialData.id), {
                    ...data,
                    sections,
                    updatedAt: serverTimestamp(),
                });
            } else {
                await addDoc(collection(db, "interviews"), {
                    ...data,
                    userId,
                    sections,
                    createdAt: serverTimestamp(),
                });
            }

            toast(toastMessage.title, { description: toastMessage.description });
            navigate("/generate", { replace: true });
        } catch (err) {
            console.error(err);
            toast.error("Error..", { description: "Something went wrong." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialData) {
            form.reset({
                position: initialData.position,
                description: initialData.description,
                experience: initialData.experience,
                techStack: initialData.techStack,
            });
        }
    }, [initialData, form]);

    return (
        <div className="w-full flex-col space-y-4">
            <Separator className="my-4" />
            <FormProvider {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="w-full p-8 rounded-lg flex-col flex gap-6 shadow-md"
                >
                    <FormField
                        control={form.control}
                        name="position"
                        render={({ field }) => (
                            <FormItem className="w-full space-y-2">
                                <FormLabel>Job Role</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., Frontend Developer" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem className="w-full space-y-2">
                                <FormLabel>Job Description</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="e.g., Responsibilities, team role, etc." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="experience"
                        render={({ field }) => (
                            <FormItem className="w-full space-y-2">
                                <FormLabel>Experience (Years)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 3" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="techStack"
                        render={({ field }) => (
                            <FormItem className="w-full space-y-2">
                                <FormLabel>Tech Stack</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="e.g., React, Node.js, PostgreSQL" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex justify-end gap-4">
                        <Button type="reset" variant="outline" disabled={loading}>
                            Reset
                        </Button>
                        <Button type="submit" disabled={loading || !isValid}>
                            {loading ? <Loader className="animate-spin" size={16} /> : actions}
                        </Button>
                    </div>
                </form>
            </FormProvider>
        </div>
    );
};
