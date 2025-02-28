"use client";

import { ContainerScroll } from "@/components/ui/container-scroll-animation";

const Landing = () => {

  return (
    <div>
      <ContainerScroll titleComponent={undefined}>
        {/* Add your children components here */}
        <div></div>
      </ContainerScroll>
    </div>
  );
};

export default Landing;
