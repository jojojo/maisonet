export default function Heading({ title, description }: { title: string; description?: string }) {
    return (
        <>
            <div className="mb-5 mn-stack-0-5">
                <h2 className="fs-4 fw-semibold">{title}</h2>
                {description && <p className="text-body-secondary small">{description}</p>}
            </div>
        </>
    );
}
