import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";

type CarouselStoryArgs = {
  slideOne: string;
  slideTwo: string;
  slideThree: string;
};

const meta = {
  title: "Components/Carousel",
  tags: ["autodocs"],
  argTypes: {
    slideOne: { control: "text" },
    slideTwo: { control: "text" },
    slideThree: { control: "text" },
  },
} satisfies Meta<CarouselStoryArgs>;

export default meta;
type Story = StoryObj<CarouselStoryArgs>;

export const Default: Story = {
  args: {
    slideOne: "Gate queue",
    slideTwo: "Action log",
    slideThree: "Node catalog",
  },
  render: (args) => {
    const slides = [args.slideOne, args.slideTwo, args.slideThree];
    return (
      <Carousel className="mx-auto w-full max-w-xs">
        <CarouselContent>
          {slides.map((slide) => (
            <CarouselItem key={slide}>
              <Card>
                <CardContent className="flex aspect-square items-center justify-center p-6">
                  <span className="text-sm font-medium">{slide}</span>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    );
  },
};
