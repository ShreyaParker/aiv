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
    position: z
        .string()
        .min(1, "Position is required")
        .max(100, "Position must be 100 characters or less"),
    description: z.string().min(10, "Description is required"),
    experience: z.coerce
        .number()
        .min(0, "Experience cannot be empty or negative"),
    techStack: z.string().min(1, "Tech stack must be at least a character"),
});

export const FormMockInterview = ({ initialData }) => {
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: initialData || {},
    });

    const { isValid, isSubmitting } = form.formState;
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { userId } = useAuth();

    const actions = initialData ? "Save Changes" : "Create";
    const toastMessage = initialData
        ? { title: "Updated..!", description: "Changes saved successfully..." }
        : { title: "Created..!", description: "New Mock Interview created..." };

    const cleanAiResponse = (responseText) => {
        let cleanText = responseText.trim();
        cleanText = cleanText.replace(/(json|```|`)/g, "");
        const jsonArrayMatch = cleanText.match(/\[.*\]/s);
        if (jsonArrayMatch) {
            cleanText = jsonArrayMatch[0];
        } else {
            throw new Error("No JSON array found in response");
        }

        try {
            return JSON.parse(cleanText);
        } catch (error) {
            throw new Error("Invalid JSON format: " + error.message);
        }
    };

    const generateAiResponse = async (data) => {
        const prompt = `
      As an experienced prompt engineer, generate a JSON array containing 5 technical interview questions along with detailed answers based on the following job information. Each object in the array should have the fields "question" and "answer", formatted as follows:

      [
        { "question": "<Question text>", "answer": "<Answer text>" },
        ...
      ] 

      Job Information:
      - Job Position: ${data?.position}
      - Job Description: ${data?.description}
      - Years of Experience Required: ${data?.experience}
      - Tech Stacks: ${data?.techStack}

      The questions should assess skills in ${data?.techStack} development and best practices, problem-solving, and experience handling complex requirements. Please format the output strictly as an array of JSON objects without any additional labels, code blocks, or explanations. Return only the JSON array with questions and answers.
    `;

        const aiResult = await chatSession.sendMessage(prompt);
        const cleanedResponse = cleanAiResponse(aiResult.response.text());
        return cleanedResponse;
    };

    const onSubmit = async (data) => {
        try {
            setLoading(true);

            if (initialData) {
                if (isValid) {
                    const aiResult = await generateAiResponse(data);

                    await updateDoc(doc(db, "interviews", initialData?.id), {
                        questions: aiResult,
                        ...data,
                        updatedAt: serverTimestamp(),
                    });
                    toast(toastMessage.title, { description: toastMessage.description });
                }
            } else {
                if (isValid) {
                    const aiResult = await generateAiResponse(data);

                    await addDoc(collection(db, "interviews"), {
                        ...data,
                        userId,
                        questions: aiResult,
                        createdAt: serverTimestamp(),
                    });

                    toast(toastMessage.title, { description: toastMessage.description });
                }
            }

            navigate("/generate", { replace: true });
        } catch (error) {
            console.log(error);
            toast.error("Error..", {
                description: `Something went wrong. Please try again later`,
            });
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
                    className="w-full p-8 rounded-lg flex-col flex items-start justify-start gap-6 shadow-md"
                >
                    <FormField
                        control={form.control}
                        name="position"
                        render={({field}) => (
                            <FormItem className="w-full space-y-4">
                                <div className="w-full flex items-center justify-between">
                                    <FormLabel>Job Role / Job Position</FormLabel>
                                    <FormMessage className="text-sm"/>
                                </div>
                                <FormControl>
                                    <Input
                                        className="h-12"
                                        disabled={loading}
                                        placeholder="eg:- Full Stack Developer"
                                        {...field}
                                        value={field.value || ""}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="description"
                        render={({field}) => (
                            <FormItem className="w-full space-y-4">
                                <div className="w-full flex items-center justify-between">
                                    <FormLabel>Job Description</FormLabel>
                                    <FormMessage className="text-sm"/>
                                </div>
                                <FormControl>
                                    <Textarea
                                        className="h-12"
                                        disabled={loading}
                                        placeholder="eg:- describe your job role"
                                        {...field}
                                        value={field.value || ""}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="experience"
                        render={({field}) => (
                            <FormItem className="w-full space-y-4">
                                <div className="w-full flex items-center justify-between">
                                    <FormLabel>Years of Experience</FormLabel>
                                    <FormMessage className="text-sm"/>
                                </div>
                                <FormControl>
                                    <Input
                                        type="number"
                                        className="h-12"
                                        disabled={loading}
                                        placeholder="eg:- 5 Years"
                                        {...field}
                                        value={field.value || ""}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="techStack"
                        render={({field}) => (
                            <FormItem className="w-full space-y-4">
                                <div className="w-full flex items-center justify-between">
                                    <FormLabel>Tech Stacks</FormLabel>
                                    <FormMessage className="text-sm"/>
                                </div>
                                <FormControl>
                                    <Textarea
                                        className="h-12"
                                        disabled={loading}
                                        placeholder="eg:- React, Typescript..."
                                        {...field}
                                        value={field.value || ""}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    <div className="w-full flex items-center justify-end gap-6">
                        <Button
                            type="reset"
                            size={"sm"}
                            variant={"outline"}
                            disabled={isSubmitting || loading}
                        >
                            Reset
                        </Button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !isValid || loading}
                            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader className="spin" size={16} color="blue"/>
                            ) : (
                                actions
                            )}
                        </button>


                    </div>


                </form>
            </FormProvider>
        </div>
    );
};
