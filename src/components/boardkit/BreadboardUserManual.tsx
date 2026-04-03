"use client";

import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { BookOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[13px] font-extrabold tracking-wide text-sky-400">{title}</h3>
      <div className="space-y-2 text-[13px] leading-[1.65] text-zinc-300">{children}</div>
    </section>
  );
}

/** 모달·인라인 등 어디서든 재사용할 본문 */
export function BreadboardManualContent() {
  return (
    <div className="space-y-5 pr-1">
      <Section title="1. 화면 구성">
        <p>
          왼쪽은 <strong className="text-zinc-100">브레드보드 캔버스</strong>(칩·연결), 아래 도크는{" "}
          <strong className="text-zinc-100">인스펙터·검증·실행</strong> 등 탭입니다. 오른쪽은{" "}
          <strong className="text-zinc-100">말로 보드 만들기</strong>, <strong className="text-zinc-100">보드 컨트롤</strong>,{" "}
          <strong className="text-zinc-100">칩 팔레트</strong>입니다.
        </p>
      </Section>

      <Section title="2. 칩 올리기·옮기기">
        <ul className="list-disc space-y-1.5 pl-4 marker:text-zinc-500">
          <li>
            오른쪽 <strong className="text-zinc-100">칩 팔레트</strong>에서 칩을 <strong className="text-zinc-100">드래그</strong>해 캔버스에
            놓습니다.
          </li>
          <li>캔버스 위의 칩을 드래그하면 위치가 바뀝니다.</li>
        </ul>
      </Section>

      <Section title="3. 선택 (칩·연결선)">
        <ul className="list-disc space-y-1.5 pl-4 marker:text-zinc-500">
          <li>
            칩을 <strong className="text-zinc-100">한 번 클릭</strong>하면 선택되고, 다른 칩을 클릭하면{" "}
            <strong className="text-zinc-100">겹쳐서 여러 개</strong> 선택됩니다.
          </li>
          <li>
            이미 선택된 칩을 <strong className="text-zinc-100">다시 클릭</strong>하면 그 칩만{" "}
            <strong className="text-zinc-100">선택 해제</strong>됩니다.
          </li>
          <li>
            <strong className="text-zinc-100">빈 바탕</strong>을 왼쪽 버튼으로 드래그하면 사각형 안의 칩들이 한꺼번에 선택됩니다.
          </li>
          <li>연결선(화살표)도 클릭해 선택할 수 있습니다.</li>
        </ul>
      </Section>

      <Section title="4. 연결하기 (손으로)">
        <ul className="list-disc space-y-1.5 pl-4 marker:text-zinc-500">
          <li>
            칩의 <strong className="text-zinc-100">출력 쪽 포트</strong>에서 마우스를 끌어{" "}
            <strong className="text-zinc-100">다음 칩의 입력 포트</strong>에 놓습니다. (화살표는 항상 출력→입력)
          </li>
          <li>
            <strong className="text-zinc-100">타입</strong>이 맞아야 합니다 (예: TXT→TXT). 맞지 않으면 선이 안 붙거나 빨간 안내가 뜹니다.
          </li>
          <li>
            <strong className="text-zinc-100">이벤트(EVT)</strong> 포트는 EVT끼리만 연결됩니다.
          </li>
          <li>선 끝을 포트 근처에 놓으면 자동으로 가까운 포트에 붙기 쉽게 되어 있습니다.</li>
        </ul>
      </Section>

      <Section title="5. 자동 연결·분리">
        <ul className="list-disc space-y-1.5 pl-4 marker:text-zinc-500">
          <li>
            칩을 <strong className="text-zinc-100">두 개 이상</strong> 선택하면 캔버스 아래쪽에{" "}
            <strong className="text-zinc-100">연결</strong> / <strong className="text-zinc-100">분리</strong> 버튼이 나옵니다.
          </li>
          <li>
            <strong className="text-zinc-100">연결</strong>: 선택된 칩을 왼쪽에서 오른쪽 순으로 한 줄로 보고,{" "}
            <strong className="text-zinc-100">바로 옆 칩끼리</strong> 타입이 맞는 포트 한 쌍씩 자동으로 이어 줍니다.
          </li>
          <li>
            <strong className="text-zinc-100">정확히 6개</strong>를 고르고, 종류가{" "}
            <strong className="text-zinc-100">입력칩 1 · (로직/실행)칩 2 · AI칩 2 · 출력칩 1</strong>이면 순서를 그 흐름에 맞춰 자동 정렬한 뒤
            연결합니다.
          </li>
          <li>
            <strong className="text-zinc-100">분리</strong>: 선택된 칩들 <strong className="text-zinc-100">서로 사이에만</strong> 있는 연결선을
            지웁니다. 바깥 칩으로 가는 선은 그대로 둡니다.
          </li>
        </ul>
      </Section>

      <Section title="6. 삭제">
        <ul className="list-disc space-y-1.5 pl-4 marker:text-zinc-500">
          <li>
            칩 또는 연결선을 선택한 뒤 <strong className="text-zinc-100">Delete</strong> 또는{" "}
            <strong className="text-zinc-100">Backspace</strong> 키를 누릅니다. (글 입력 중인 칸에 포커스가 있을 때는 동작하지 않을 수 있습니다.)
          </li>
          <li>
            캔버스 오른쪽 아래 <strong className="text-zinc-100">선택 삭제</strong> 버튼으로도 같이 지울 수 있습니다.
          </li>
        </ul>
      </Section>

      <Section title="7. 캔버스 움직이기·확대">
        <ul className="list-disc space-y-1.5 pl-4 marker:text-zinc-500">
          <li>
            <strong className="text-zinc-100">팬(이동)</strong>: 마우스 <strong className="text-zinc-100">가운데 버튼</strong>으로 드래그하거나,{" "}
            <strong className="text-zinc-100">스페이스 키를 누른 채</strong> 드래그합니다.
          </li>
          <li>
            <strong className="text-zinc-100">줌</strong>: 휠 또는 트랙패드 핀치. 모바일에서도 핀치 줌이 가능하도록 되어 있습니다.
          </li>
        </ul>
      </Section>

      <Section title="8. 말로 보드 만들기·보드 관리">
        <ul className="list-disc space-y-1.5 pl-4 marker:text-zinc-500">
          <li>
            오른쪽 위 <strong className="text-zinc-100">말로 보드 만들기</strong>에 문장을 적고 적용하면, 문장 내용에 맞춰 칩 줄이 캔버스 오른쪽에
            이어 붙습니다. 이 배치 로직은 <strong className="text-zinc-100">브라우저 안에서만</strong> 돌아가므로, 페이지를 연 뒤에는{" "}
            <strong className="text-zinc-100">인터넷 없이</strong>도 배치할 수 있습니다.
          </li>
          <li>
            <strong className="text-zinc-100">보드 컨트롤</strong>에서 보드를 바꾸고, 이름을 고치고, 새 보드·삭제·JSON 저장/불러오기를 할 수 있습니다.{" "}
            <strong className="text-zinc-100">미리보기</strong>는 AI용 마크다운(실행·검증·골든 결과 포함)을 창에서 확인·복사할 수 있고,{" "}
            <strong className="text-zinc-100">결과값 도출</strong>은 같은 내용을 바로 .md 파일로 저장합니다. 여러 보드는 브라우저 저장소에 자동
            저장됩니다.
          </li>
        </ul>
      </Section>

      <Section title="9. 인스펙터·검증·실행·연결 설명">
        <ul className="list-disc space-y-1.5 pl-4 marker:text-zinc-500">
          <li>
            <strong className="text-zinc-100">인스펙터</strong>: 선택한 칩·연결의 상세(포트, 설정 등)가 아래에 표시됩니다.{" "}
            <strong className="text-zinc-100">Config</strong>로 칩 설정 창을 열 수 있습니다.
          </li>
          <li>
            <strong className="text-zinc-100">검증</strong>: 보드가 규칙에 맞는지 오류·경고를 봅니다.
          </li>
          <li>
            <strong className="text-zinc-100">실행</strong>: 데모용 mock 실행 결과를 봅니다.
          </li>
          <li>
            <strong className="text-zinc-100">연결 설명</strong>: 현재 보드의 흐름을 글로 풀어 설명합니다.
          </li>
          <li>
            <strong className="text-zinc-100">히스토리</strong>: 실행 취소(Undo)·다시 실행(Redo)입니다.
          </li>
        </ul>
      </Section>

      <p className="rounded-lg border border-dashed border-zinc-700/80 bg-zinc-900/40 px-2.5 py-2 text-[12px] text-zinc-500">
        팁: 캔버스 왼쪽 위에서 보드 이름을 고칠 수 있고, 오른쪽 위 <strong className="text-zinc-400">요약</strong>에서 칩·연결 개수를 빠르게 볼 수
        있습니다.
      </p>
    </div>
  );
}

type ModalProps = {
  className?: string;
};

/** 하단 도크 탭 줄 옆 등에 두는 트리거 + 모달 */
export function UserManualDialog({ className }: ModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-9 shrink-0 gap-1.5 border-zinc-600 bg-zinc-950/90 px-3 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-50",
            className
          )}
        >
          <BookOpen className="size-3.5 text-sky-500" aria-hidden />
          사용설명서
        </Button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[200] bg-black/65 backdrop-blur-[2px]"
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-[201] flex max-h-[min(88vh,720px)] w-[min(100vw-1.5rem,520px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-zinc-600 bg-zinc-950 shadow-2xl ring-1 ring-white/10 duration-200",
            "outline-none"
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
            <DialogPrimitive.Title className="flex items-center gap-2 text-base font-bold tracking-tight text-zinc-100">
              <BookOpen className="size-5 text-sky-500" aria-hidden />
              사용설명서
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="ghost" size="icon-sm" className="text-zinc-400 hover:text-zinc-100" aria-label="닫기">
                <X className="size-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <DialogPrimitive.Description className="sr-only">
            브레드보드 에디터 사용 방법: 칩 배치, 연결, 자동 연결, 캔버스 조작, 보드 관리 등
          </DialogPrimitive.Description>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <BreadboardManualContent />
          </div>

          <div className="shrink-0 border-t border-zinc-800 px-4 py-3">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="secondary" className="w-full">
                닫기
              </Button>
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * 예전 이름. 인스펙터 안에 `<BreadboardUserManual />`가 남아 있으면 import만 맞추면 됩니다.
 * `defaultOpen`은 모달 버튼 방식에서는 쓰이지 않아 무시됩니다. 새 코드는 `UserManualDialog`만 쓰면 됩니다.
 */
export function BreadboardUserManual({
  defaultOpen: _unused,
  ...props
}: ModalProps & { defaultOpen?: boolean }) {
  return <UserManualDialog {...props} />;
}

export default UserManualDialog;
