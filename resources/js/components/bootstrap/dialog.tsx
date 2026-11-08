import { cn } from '@/lib/utils';
import {
    cloneElement,
    createContext,
    isValidElement,
    useContext,
    useId,
    useState,
    type HTMLAttributes,
    type ReactElement,
    type ReactNode,
} from 'react';
import Modal from 'react-bootstrap/Modal';
const Context = createContext<{ open: boolean; setOpen: (open: boolean) => void; id: string } | null>(null);
function useDialog() {
    const value = useContext(Context);
    if (!value) throw new Error('Modal context required');
    return value;
}
export function Dialog({
    open,
    defaultOpen = false,
    onOpenChange,
    children,
}: {
    open?: boolean;
    defaultOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: ReactNode;
}) {
    const [internal, setInternal] = useState(defaultOpen);
    const id = useId();
    return (
        <Context.Provider
            value={{
                open: open ?? internal,
                id,
                setOpen: (value) => {
                    setInternal(value);
                    onOpenChange?.(value);
                },
            }}
        >
            {children}
        </Context.Provider>
    );
}
export function DialogContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const dialog = useDialog();
    return (
        <Modal
            show={dialog.open}
            onHide={() => dialog.setOpen(false)}
            centered
            scrollable
            aria-labelledby={dialog.id + '-title'}
            aria-describedby={dialog.id + '-description'}
            contentClassName={cn('family-modal', className)}
        >
            <Modal.Header closeButton closeLabel="Fermer" className="border-0 pb-0" />
            <Modal.Body {...props}>{children}</Modal.Body>
        </Modal>
    );
}
export function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('mb-4', className)} {...props} />;
}
export function DialogTitle(props: HTMLAttributes<HTMLHeadingElement>) {
    const { id } = useDialog();
    return <h2 id={id + '-title'} className="h4" {...props} />;
}
export function DialogDescription(props: HTMLAttributes<HTMLParagraphElement>) {
    const { id } = useDialog();
    return <p id={id + '-description'} className="text-body-secondary" {...props} />;
}
export function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('modal-footer border-0 px-0 pb-0', className)} {...props} />;
}
function Control({ asChild, children, action, ...props }: HTMLAttributes<HTMLButtonElement> & { asChild?: boolean; action: boolean }) {
    const dialog = useDialog();
    if (asChild && isValidElement(children)) {
        const child = children as ReactElement<{ onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void }>;
        return cloneElement(child, {
            ...props,
            onClick: (event) => {
                child.props.onClick?.(event);
                if (!event.defaultPrevented) dialog.setOpen(action);
            },
        });
    }
    return (
        <button type="button" {...props} onClick={() => dialog.setOpen(action)}>
            {children}
        </button>
    );
}
export function DialogTrigger(props: HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
    return <Control {...props} action={true} />;
}
export function DialogClose(props: HTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
    return <Control {...props} action={false} />;
}
