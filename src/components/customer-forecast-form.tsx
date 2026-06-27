"use client";

import { useMemo, useState } from "react";

type Channel = {
  id: string;
  name: string;
  code: string;
};

type BoxDraft = {
  boxSpec: string;
  expectedOrderCount: number;
  channelIds: string[];
};

export function CustomerForecastForm({
  channels,
  action
}: {
  channels: Channel[];
  action: (formData: FormData) => void;
}) {
  const [boxes, setBoxes] = useState<BoxDraft[]>([
    { boxSpec: "", expectedOrderCount: 1, channelIds: [] }
  ]);
  const [notes, setNotes] = useState("");
  const [template, setTemplate] = useState<BoxDraft>({
    boxSpec: "",
    expectedOrderCount: 1,
    channelIds: []
  });
  const [batchCount, setBatchCount] = useState(5);

  const payload = useMemo(() => JSON.stringify(boxes), [boxes]);
  const templateReadyForCreate =
    template.boxSpec.trim().length > 0 &&
    Number.isInteger(template.expectedOrderCount) &&
    template.expectedOrderCount > 0 &&
    template.channelIds.length > 0 &&
    template.channelIds.length <= 2;
  const templateReadyForApply =
    template.boxSpec.trim().length > 0 ||
    (Number.isInteger(template.expectedOrderCount) && template.expectedOrderCount > 0) ||
    template.channelIds.length > 0;

  return (
    <form action={action} className="card soft stacked">
      <div className="section-head">
        <div>
          <h3>创建预报</h3>
          <p className="muted">按箱维护预报信息，每箱最多选择两个渠道，提交后即可导出箱唛。</p>
        </div>
        <button
          type="button"
          onClick={() =>
            setBoxes((prev) => [...prev, { boxSpec: "", expectedOrderCount: 1, channelIds: [] }])
          }
        >
          新增箱子
        </button>
      </div>

      <div
        className="compact-item"
        style={{
          padding: "1rem 1.05rem",
          borderRadius: 24,
          gap: "0.9rem",
          background: "var(--surface-2)"
        }}
      >
        <div className="section-head">
          <div>
            <strong>批量模板</strong>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              先设置一个标准箱模板，再批量新增或一键应用到全部箱子。
            </p>
          </div>
          <div className="toolbar" style={{ justifyContent: "flex-end" }}>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setTemplate(boxes[0] ?? { boxSpec: "", expectedOrderCount: 1, channelIds: [] })
              }
            >
              读取箱子 1
            </button>
            <button
              type="button"
              className="secondary"
              disabled={!templateReadyForApply}
              onClick={() =>
                setBoxes((prev) =>
                  prev.map((item) => ({
                    ...item,
                    boxSpec: template.boxSpec.trim() ? template.boxSpec : item.boxSpec,
                    expectedOrderCount:
                      template.expectedOrderCount > 0
                        ? template.expectedOrderCount
                        : item.expectedOrderCount,
                    channelIds: template.channelIds.length > 0 ? template.channelIds : item.channelIds
                  }))
                )
              }
            >
              应用到全部箱子
            </button>
          </div>
        </div>

        <div className="grid two">
          <input
            placeholder="模板箱规，例如 60*40*50"
            value={template.boxSpec}
            onChange={(event) =>
              setTemplate((prev) => ({ ...prev, boxSpec: event.target.value }))
            }
          />
          <input
            type="number"
            min={1}
            placeholder="模板每箱订单数"
            value={template.expectedOrderCount}
            onChange={(event) =>
              setTemplate((prev) => ({
                ...prev,
                expectedOrderCount: Number(event.target.value)
              }))
            }
          />
        </div>

        <span className="muted">模板渠道最多选择 2 个</span>
        <div className="checkbox-grid">
          {channels.map((channel) => {
            const checked = template.channelIds.includes(channel.id);
            return (
              <label key={channel.id}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setTemplate((prev) => {
                      const next = checked
                        ? prev.channelIds.filter((id) => id !== channel.id)
                        : [...prev.channelIds, channel.id].slice(0, 2);
                      return { ...prev, channelIds: next };
                    })
                  }
                />
                {channel.code}
              </label>
            );
          })}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(160px, 220px) minmax(0, 1fr)",
            gap: "0.85rem",
            alignItems: "center"
          }}
        >
          <input
            type="number"
            min={1}
            max={200}
            placeholder="新增箱数"
            value={batchCount}
            onChange={(event) => setBatchCount(Number(event.target.value) || 1)}
          />
          <div className="toolbar" style={{ justifyContent: "space-between", width: "100%" }}>
            <span className="muted">适合一批箱规、件数、渠道都相同的场景。</span>
            <button
              type="button"
              disabled={!templateReadyForCreate}
              onClick={() =>
                setBoxes((prev) => [
                  ...prev,
                  ...Array.from({ length: Math.max(1, batchCount) }, () => ({
                    boxSpec: template.boxSpec,
                    expectedOrderCount: template.expectedOrderCount,
                    channelIds: [...template.channelIds]
                  }))
                ])
              }
            >
              按模板新增 {Math.max(1, batchCount)} 箱
            </button>
          </div>
        </div>
      </div>

      {boxes.map((box, index) => (
        <div key={index} className="box-editor">
          <div className="row-between">
            <strong>箱子 {index + 1}</strong>
            {boxes.length > 1 ? (
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setBoxes((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                移除
              </button>
            ) : null}
          </div>
          <div className="grid two">
            <input
              placeholder="箱规，例如 60*40*50"
              required
              value={box.boxSpec}
              onChange={(event) =>
                setBoxes((prev) =>
                  prev.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, boxSpec: event.target.value } : item
                  )
                )
              }
            />
            <input
              type="number"
              min={1}
              placeholder="每箱订单数"
              required
              value={box.expectedOrderCount}
              onChange={(event) =>
                setBoxes((prev) =>
                  prev.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, expectedOrderCount: Number(event.target.value) }
                      : item
                  )
                )
              }
            />
          </div>
          <span className="muted">渠道最多选择 2 个</span>
          <div className="checkbox-grid">
            {channels.map((channel) => {
              const checked = box.channelIds.includes(channel.id);
              return (
                <label key={channel.id}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setBoxes((prev) =>
                        prev.map((item, itemIndex) => {
                          if (itemIndex !== index) {
                            return item;
                          }

                          const next = checked
                            ? item.channelIds.filter((id) => id !== channel.id)
                            : [...item.channelIds, channel.id].slice(0, 2);
                          return { ...item, channelIds: next };
                        })
                      )
                    }
                  />
                  {channel.code}
                </label>
              );
            })}
          </div>
        </div>
      ))}
      <textarea
        placeholder="备注"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      <input type="hidden" name="boxesPayload" value={payload} />
      <input type="hidden" name="notes" value={notes} />
      <div className="toolbar">
        <button type="submit">提交预报</button>
        <span className="muted">提交后系统会生成预报编号、箱号和可打印箱唛。</span>
      </div>
    </form>
  );
}
