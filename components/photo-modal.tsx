"use client"

import type React from "react"
import { Dialog, Transition } from "@headlessui/react"
import { Fragment } from "react"
import type { Photo } from "@/types"
import { Tag } from "lucide-react"

interface PhotoModalProps {
  isOpen: boolean
  onClose: () => void
  photo: Photo | null
}

const PhotoModal: React.FC<PhotoModalProps> = ({ isOpen, onClose, photo }) => {
  if (!photo) {
    return null
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                  {photo.title}
                </Dialog.Title>
                <div className="mt-2">
                  <img
                    src={photo.url || "/placeholder.svg"}
                    alt={photo.title}
                    className="w-full object-cover rounded-md mb-3"
                  />
                  <p className="text-sm text-gray-500">{photo.description}</p>
                </div>

                {/* Tags Section - wherever tags are displayed */}
                {photo.tags && photo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {photo.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {typeof tag === "string" ? tag : tag.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default PhotoModal
